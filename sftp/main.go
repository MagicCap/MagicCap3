package main

import (
	"encoding/binary"
	"encoding/json"
	"errors"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

type sshAuthentication struct {
	Password   *string `json:"password"`
	PrivateKey *string `json:"privateKey"`
}

type sshBody struct {
	Hostname       string            `json:"hostname"`
	Port           int               `json:"port"`
	Username       string            `json:"username"`
	Authentication sshAuthentication `json:"authentication"`
	Directory      string            `json:"directory"`
	Filename       string            `json:"filename"`
	Domain         string            `json:"domain"`
}

func connect(body sshBody) (*ssh.Client, error) {
	authMethods := []ssh.AuthMethod{}
	if body.Authentication.Password != nil {
		authMethods = []ssh.AuthMethod{ssh.Password(*body.Authentication.Password)}
	} else if body.Authentication.PrivateKey != nil {
		// Get the relevant private key string.
		pKey := []byte(*body.Authentication.PrivateKey)
		if len(pKey) == 0 {
			// Find if there's a key at ~/.ssh/id_rsa.
			pKey = nil
			homeDir, err := os.UserHomeDir()
			if err == nil {
				pKey, _ = os.ReadFile(filepath.Join(homeDir, ".ssh", "id_rsa"))
			}
		}

		// If the key was found, attempt to load it.
		if pKey != nil {
			s, err := ssh.ParsePrivateKey(pKey)
			if err != nil {
				return nil, err
			}
			authMethods = []ssh.AuthMethod{ssh.PublicKeys(s)}
		}
	}
	return ssh.Dial("tcp", body.Hostname+":"+strconv.Itoa(body.Port), &ssh.ClientConfig{
		User:            body.Username,
		Auth:            authMethods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	})
}

func upload(sshClient *ssh.Client, directory, filename, domain string) (string, error) {
	if !strings.Contains(domain, "://") {
		domain = "https://" + domain
	}
	u, err := url.Parse(domain)
	if err != nil {
		return "", err
	}
	u.Path = "/" + url.PathEscape(filename)
	c, err := sftp.NewClient(sshClient)
	if err != nil {
		return "", err
	}
	f, err := c.Create(filepath.Join(directory, filename))
	if err != nil {
		return "", err
	}
	buf := make([]byte, 4)
	if _, err := os.Stdin.Read(buf); err != nil {
		return "", err
	}
	len := binary.LittleEndian.Uint32(buf)
	buf = make([]byte, len)
	n, err := os.Stdin.Read(buf)
	if err != nil {
		return "", err
	}
	if uint32(n) != len {
		return "", errors.New("unexpected end of file")
	}
	if _, err := f.Write(buf); err != nil {
		return "", err
	}
	return u.String(), nil
}

func main() {
	var body sshBody
	if err := json.Unmarshal([]byte(os.Getenv("CONNECTION_BLOB")), &body); err != nil {
		_, _ = os.Stderr.WriteString("internal communication error: " + err.Error())
		_ = os.Stderr.Sync()
		return
	}
	x, err := connect(body)
	if err != nil {
		_, _ = os.Stderr.WriteString("failed to connect to sftp host: " + err.Error())
		_ = os.Stderr.Sync()
		return
	}
	_, _ = os.Stdout.Write([]byte("r"))
	_ = os.Stdout.Sync()
	u, err := upload(x, body.Directory, body.Filename, body.Domain)
	if err != nil {
		_, _ = os.Stderr.WriteString("failed to upload file: " + err.Error())
		_ = os.Stderr.Sync()
		return
	}
	_, _ = os.Stdout.WriteString(u)
	_ = os.Stdout.Sync()
}

package main

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	ps "github.com/mitchellh/go-ps"
)

func extract(buf []byte, appPath string) {
	// Create a new zip reader.
	reader, err := zip.NewReader(bytes.NewReader(buf), int64(len(buf)))
	if err != nil {
		panic(err)
	}

	// Extract everything in the path "MagicCap.app" in the zip to the app path.
	for _, file := range reader.File {
		// Get the real relative path.
		relPath := strings.TrimPrefix(file.Name, "MagicCap.app/")
		if relPath == "" {
			continue
		}

		// Make the folders.
		if err := os.MkdirAll(filepath.Join(appPath, filepath.Dir(relPath)), os.ModePerm); err != nil {
			panic(err)
		}

		// Open the file.
		if file.FileInfo().IsDir() {
			continue
		}
		fmt.Println(relPath)
		dstFile, err := os.OpenFile(filepath.Join(appPath, relPath), os.O_WRONLY|os.O_CREATE|os.O_TRUNC, file.Mode())
		if err != nil {
			panic(err)
		}

		// Open the file.
		openedFile, err := file.Open()
		if err != nil {
			panic(err)
		}

		// Copy to the destination.
		if _, err := io.Copy(dstFile, openedFile); err != nil {
			panic(err)
		}

		// Close the file.
		dstFile.Close()
		openedFile.Close()
	}
}

func rmFilesInFolder(f string) error {
	items, err := ioutil.ReadDir(f)
	if err != nil {
		return err
	}
	for _, v := range items {
		path := filepath.Join(f, v.Name())
		if err = os.RemoveAll(path); err != nil {
			return err
		}
	}
	return nil
}

func main() {
	// Get the URL and app path.
	url := os.Args[1]
	appPath := os.Args[2]

	// Perform a GET request to the URL.
	resp, err := http.Get(url)
	if err != nil {
		panic(err)
	}

	// Get the status.
	if resp.StatusCode != 200 {
		panic("Status code was not 200")
	}

	// Read the response body into a buffer.
	buf, err := io.ReadAll(resp.Body)
	if err != nil {
		panic(err)
	}

	// Find the running MagicCap process.
	processList, err := ps.Processes()
	if err != nil {
		panic(err)
	}
	var pid int
	for _, process := range processList {
		if process.Executable() == "MagicCap" {
			pid = process.Pid()
			break
		}
	}
	if pid == 0 {
		panic("MagicCap process not found")
	}

	// Kill the process.
	proc, err := os.FindProcess(pid)
	if err != nil {
		panic(err)
	}
	if err = proc.Kill(); err != nil {
		panic(err)
	}

	// Remove everything in the MagicCap folder.
	if err = rmFilesInFolder(appPath); err != nil {
		panic(err)
	}

	// Do the extraction.
	extract(buf, appPath)

	// Make a gatekeeper exception if possible.
	_, _ = os.StartProcess("spctl", []string{"spctl", "--add", appPath}, &os.ProcAttr{})

	// Open the application.
	_, err = os.StartProcess("open", []string{appPath}, &os.ProcAttr{})
	if err != nil {
		panic(err)
	}
}

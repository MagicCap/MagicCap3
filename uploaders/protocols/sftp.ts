// !!! SPECIAL CASE !!!: Whilst we try and keep this as a seperate package, with this file specifically,
// it is near impossible since ssh2 does not bundle well on Darwin. Therefore, here we need a special API
// hook to any other package (which is likely main, the implementation of this case being in
// main/sftp_special_case.ts). If this uploaders package is loaded into something else, __MAGICCAP_SFTP__
// will need to be implemented in globalThis with the signature below.

export default (
    hostname: string, port: number, username: string,
    authentication: {password: string} | {privateKey: string},
    directory: string, filename: string, content: Buffer, domain: string
): Promise<string> => {
    // @ts-ignore
    return globalThis.__MAGICCAP_SFTP__(hostname, port, username, authentication, directory, filename, content, domain);
};

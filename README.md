<p><img src="https://i.imgur.com/3YKOjAF.png" alt="MagicCap" width="50%"></p>

<p>
    <a href="https://opensource.org/licenses/MPL-2.0" title="Licensed under MPL 2.0" target="_blank">
        <img src="https://img.shields.io/badge/license-MPL%202.0-brightgreen.svg?logo=Mozilla&logoColor=fff" alt=""/>
    </a>
    <a href="https://patreon.com/jakemakesstuff" title="Donate to this project using Patreon" target="_blank">
        <img src="https://img.shields.io/badge/patreon-donate-yellow.svg?logo=Patreon&logoColor=fff" alt=""/>
    </a>
    <a href="https://ko-fi.com/jakemakesstuff" title="Donate to this project using ko-fi" target="_blank">
        <img src="https://img.shields.io/badge/kofi-donate-yellow.svg?logo=Ko-fi&logoColor=fff" alt=""/>
    </a>
    <a href="https://discord.gg/pTcBGcH" title="Chat on Discord" target="_blank">
        <img src="https://img.shields.io/discord/475694715640217631.svg?logo=discord&logoColor=fff&color=7289DA" alt=""/>
    </a>
</p>

MagicCap is a image/GIF capture suite for Mac and Linux. You can get a precompiled copy from the releases page of this GitHub page. It has the following features:

- Very cross compatible. You should get the same experience on Mac and Linux.
- Very fast. Captures are optimised to be as fast as possible.
- Very flexible. You can choose to upload to whatever service you want to or just save the file.
- Very functional. Want to capture a GIF? No problem. Want to blur a screenshot? No problem. MagicCap is there to help you with whatever you want.

# This is not for Windows!
[ShareX](https://getsharex.com/) is amazing for that!

# Supported Uploaders
MagicCap supports the following uploaders (this list will expand over time):
- elixi.re
- Passive (S)FTP
- Pomf
- imgur
- Lunus
- i.magiccap
- reUpload
- Ultrashare
- S3 (Amazon and other S3-compatible providers)
- ShareX (upload only)

# Credit
The following people have done a ton to help in the creation of MagicCap. If you have done something to help and want your name here, feel free to make a pull request. This is in alphabetical order, not the order of the work people have done:
- Devon (Da532) - Made all of the branding.
- Harrison (AO554) - Helped us test for Mac.
- Jacob (Kelwing) - Helped with some Go towards the project.
- Jake (JakeMakesStuff) - Made the majority of the GUI/capture code for MagicCap.
- Jake (techfan36) - Helped us test for Linux.
- Matt (IPv4) - Refactored file naming, added random emoji & upload from clipboard.
- Rhys (SunburntRock89) - Helped me with the structure and fixing bugs. Also fixed FTP.
- Sam (REC) - Made the FTP logo.

# Building
MagicCap is built as many modules. The reason for this is that modules can be easily hot reloaded, making updates significantly faster than with previous releases. To assist with this, we have split the application into several modules with a centralised webpacker.

To compile a release from source, you will need Go 1.17+, nvm, GNU Make, and a working CXX toolchain (if you have XCode installed on macOS, you have this, if not, install `g++` and `gcc`). From here, you can simply run `make` and the release will automatically be built. On macOS, this will make the app as a universal binary. On Linux, this will build a folder for your specific architeture.

From here, you can run `make package`. This will make a dmg on macOS and a deb and rpm on Linux.

## Development
If you wish to develop MagicCap, you will need the same dependencies as above with the addition of yarn. When you have these installed, you can use `nvm install` to jump to the version of Node we use in our development environment and then run `yarn` to install all packages/run all build scripts. After this, you can simply run `yarn run dev-run` to jump into the development environment. From here, you should note the following:
1. **We actively try and avoid native modules:** Whilst sometimes they are needed, most of the time they are not and only serve to make the development experience more complex since they cannot be webpack'd.
2. **Modules should be fully unloadable:** With the exception of bootloader which should rarely be touched, modules should be fully unloadable. This means no background loops in anything except browser processes and `main`, and in `main` the background loop must be stoppable within `main/unloader.ts`.
3. **Development hot reloads (mostly!):** If you are editing `bootloader.js` or `libscreenshot` you will need to do a restart of your dev environment, if you are modifying some of the Go processes you will need to run the build command for them. However, for all modules, they should be hot reloadable. If your code isn't, see the above point!

## Mac Note
If you are on Mac, you'll need to download XCode.

## File structure
Here are the manually editable files in the root folder:

### `assets`
This folder should rarely be used. It is mainly here for main assets that have to be given as paths.

### `build`
Most of the build scripts/metadata for MagicCap belongs here.

### `config`
This is the configuration for MagicCap, written in React. Most communication with the main process is done in `config/utils/main_api.ts` and `main/config_callbacks.ts`, although some hooks are set in `config/config_preload.js`.

### `editors`
The editors used in MagicCap.

### `gif`
The Go application which is responsible for GIF capture and encoding. This is another process to allow for smooth multi-threading. The GIF is sent via stdout.

### `inplace_upgrade`
Used on macOS to replace the app during update in the event that the whole bundle needs to be replaced for whatever reason.

### `libscreenshot`
A native Node module written for significant (sometimes literally 2 second) performance gains over the Electron screen capture API.

### `main`
The main module that is spawned by the bootloader. Basically responsible for all things MagicCap that are not done in a browser window. It is worth noting that `main/index.ts` and `main/init.ts` are different. `main/index.ts` is first to load the exception handler/run any migrations, and then `main/init.ts` handles the initialisation of the application.

### `region_selector`
The React application responsible for rendering the region selector. It is worth noting that the region selector can both be pooled waiting for a response or automatically sprung up.

### `sftp`
A Go application to handle SFTP due to some difficulties in normalising the build files on macOS for universal binaries with ssh2.

### `uploaders`
The uploaders used in MagicCap. Where possible, these uploaders are split into implementations and protocols. All uploaders should be exported in the index file, and it should only be uploaders exported there with the exception of `secretKeys`.

### `webpacks`
The webpack configurations which are used for the various JS bundles. The webpack configurations should behave like they are in the root and named `webpack.<module folder>.js`. They will then be automatically picked up by the webpacker and launched in a process to build. `webpack.common.js` is an exception which is shared across most of the modules.

### `bootloader.js`
Handles making sure that main is updated if the app bundle has been, handling several globals relating to reloading and native modules, loading main, and making sure that webpacker is setup in development.

### `webpacker.js`
This handles caching, multi-processing, and invoking webpack for all `webpacks` described above. The webpack cache is stored at `~/.magiccap-dev/webpack_cache/<module folder>`.

### `sharedTypes.d.ts`
This is a shared type definition file for all of the modules. It is used to ensure that all modules are compatible with each other when there is something they depend upon sharing.

### `.eslintrc`
The ESLint configuration for MagicCap. This just uses the recommended options with some opinionated changes, the reasons of which are documented.

### `.nvmrc`
The Node version used for MagicCap development.

### `Makefile`
Includes all the scripts relating to the compilation, packaging, and deployment of MagicCap.

### `package.json`
A standard package.json file for MagicCap. It has a few scripts within it, although long scripts relating to compilation should go into the Makefile.

### `tsconfig.json`
The MagicCap TypeScript configuration.

import { Database } from "better-sqlite3";
import { Display } from "electron";

export type JSONValue =
    | string
    | number
    | boolean
    | null
    | JSONValue[]
    | {[key: string]: JSONValue};

export interface ConfigInterface {
    db: Database;
    getConfig(key: string): JSONValue | undefined;
    getAllOptions(): {[key: string]: JSONValue};
    setConfig(key: string, value: JSONValue | undefined): void;
}

export type ToolboxItem = {
    // Defines the base64 encoded icon for the item.
    icon: string;

    // Defines the ID for the item. Per convention, "__selector" is our internal selector.
    id: string;

    // Defines the description of the toolbox item.
    description: string;
};

export type SelectorDone = {
    // If this was cancelled, it will be the only option in the object.
    cancelled: true;
} | {
    // Handle non-cancelled selection.
    cancelled: false;

    // Defines the relative top of the selection.
    relativeTop: number;

    // Defines the relative left of the selection.
    relativeLeft: number;

    // Defines the width of the selection.
    width: number;

    // Defines the height of the selection.
    height: number;
};

export type EditorDone = {
    // Defines the editor ID.
    editorId: string;

    // Defines the RGB value in the selector.
    rgb: [number, number, number];

    // Defines the relative top of the selection.
    relativeTop: number;

    // Defines the relative left of the selection.
    relativeLeft: number;

    // Defines the width of the selection.
    width: number;

    // Defines the height of the selection.
    height: number;
};

export type SelectorBaseConfig = {
    // Defines the toolbox items.
    toolboxItems: ToolboxItem[];

    // Defines if the region of the image should be returned as bytes.
    returnRegion: boolean;
};

export interface SelectorScreenSpecificConfig extends SelectorBaseConfig {
    // Defines a base64 encoded image of the screen.
    image: string;

    // Defines the scale.
    scale: number;

    // Defines the notch.
    notch: number;

    // Defines the cursor position if it is on the screen.
    cursorPosition: {x: number; y: number} | null;

    // Defines the display bounds.
    displayBounds: {x: number; y: number; width: number; height: number};
}

export interface EditorCtx {
    config: ConfigInterface;
    event: EditorDone;
    display: Display;
    getFullscreen(deepCopy: boolean): Buffer;
    getRegion(relTop: number, relLeft: number, width: number, height: number): Promise<Buffer>;
}

export type AnnouncementPayload = {
    // Defines the channel.
    channel: string;

    // Defines the message payload.
    payload: any;
};

export interface EditorInfo {
    // Defines the title of the editor.
    title: string;

    // Defines the description of the editor.
    description: string;

    // Defines the index of the editor.
    index: number;

    // Defines the icon for the editor.
    icon: Buffer;
}

export interface EditorInfoWithID extends EditorInfo {
    // Defines the ID of the uploader.
    id: string;
}

export type EditorRegisterCtx = {
    config: ConfigInterface;
    register(editorInfo: EditorInfo, cb: (ctx: EditorCtx) => Promise<Buffer>): () => void;
};

export type SelectorResult = {
    // Defines the display that the selector was ran from.
    display: Display;

    // Defines the relative position of the selection.
    relPosition: {top: number; left: number; width: number; height: number};

    // Defines the actual position of the selection.
    actualPosition: {top: number; left: number; width: number; height: number};

    // Defines the selection as a buffer.
    selection?: Buffer;
};


interface UploaderOptionStatic {
    // Defines the key of the option.
    key: string;

    // Defines the option name.
    name: string;

    // Defines if they are required.
    required: boolean;

    // Defines if the option should be secret.
    secret: boolean;
}

interface UploaderOptionBoolean extends UploaderOptionStatic {
    // Defines the boolean type.
    type: "boolean";

    // Defines the default value if it is set.
    default?: boolean;
}

interface UploaderOptionObject extends UploaderOptionStatic {
    // Defines the object type.
    type: "object";

    // Defines the default value if it is set.
    default?: {[key: string]: JSONValue};
}

interface UploaderOptionString extends UploaderOptionStatic {
    // Defines the string types.
    type: "text" | "password" | "url";

    // Defines the default value if it is set.
    default?: string;
}

interface UploaderOptionFileJSON extends UploaderOptionStatic {
    // Defines the file type.
    type: "file" | "json";

    // Defines the file extension type.
    extensions: string[];

    // Defines the default value if it is set.
    default?: string;
}

interface UploaderOptionNumber extends UploaderOptionStatic {
    // Defines the type.
    type: "uint" | "int";

    // Defines the default value if it is set.
    default?: number;

    // Sets the minimum value.
    min?: number;

    // Sets the maximum value.
    max?: number;
}

interface UploaderOptionEnum extends UploaderOptionStatic {
    // Defines the type.
    type: "enum";

    // Defines the options.
    options: string[];

    // Defines the default option if it is set.
    default?: number;

    // Defines conditional types that may be shown directly below depending on the enum.
    conditional?: {[option: string]: UploaderOption[]};
}

export type OAuthClientInformation = {
    authorizationUrl: string;
    clientId: string;
    scope?: string;
    accessType?: string;
};

export type OAuth2Callback = (config: ConfigInterface, urlParams: {[key: string]: string}) => Promise<string>;

interface UploaderOptionOAuth2 extends UploaderOptionStatic {
    // Defines the type.
    type: "oauth2";

    // Defines the authorization URL.
    authorizationUrl: string;

    // Defines the client ID key.
    clientIdKey: string;

    // Defines the client access type. Mainly here for Google who decides to go off spec.
    accessType?: string;

    // Defines the client scope.
    scope?: string;

    // Defines the default token value.
    default?: string;

    // Defines the callback.
    callback: OAuth2Callback;
}

export type UploaderOption = UploaderOptionBoolean |
    UploaderOptionObject |
    UploaderOptionString |
    UploaderOptionFileJSON |
    UploaderOptionNumber |
    UploaderOptionEnum |
    UploaderOptionOAuth2;

type Category = {
    name: string;
    description: string;
};

interface UploaderDetails {
    name: string;
    description: string;
    options: UploaderOption[];
    category: Category;
}

export interface JSONableUploaderDetails extends UploaderDetails {
    icon: string;
}

export interface Uploader extends UploaderDetails {
    icon: Buffer;
    upload(config: Map<string, any>, data: Buffer, filename: string): Promise<string>;
}

export type RequestPacket = {
    // Defines the event type.
    type: string;

    // Defines the data.
    data: any;
};

export type Capture = {
    // Defines the filename.
    filename: string;

    // Defines if this is successful.
    success: boolean;

    // Defines the timestamp.
    timestamp: number;

    // Defines the URL.
    url: string | null;

    // Defines the file path.
    filePath: string | null;
};

export type BundleBlob = {
    // A base64 encoded blob of the bundle specified.
    encodedBlob: string;

    // A base64 encoded blob for the map of the bundle.
    encodedMapBlob: string;

    // Defines the commit hash.
    commitHash: string;
};

export type CoreBlob = {
    // Defines the CDN URL.
    cdnUrl: string;

    // Defines the commit hash.
    commitHash: string;
};

export type UpdateAPIResponse = {
    // Defines the uploaders kernel blob, if it can be hot updated on its own.
    uploaders: BundleBlob | null;

    // Defines the editors blob, if it can be hot updated on its own.
    editors: BundleBlob | null;

    // Defines the main blob, if it can be hot updated on its own.
    main: BundleBlob | null;

    // Defines the config blob, if it can be hot updated on its own.
    config: BundleBlob | null;

    // Defines the selector blob, if it can be hot updated on its own.
    selector: BundleBlob | null;

    // Defines if the core electron bundle needs updating.
    core: CoreBlob | null;
};

declare global {
    const __MAGICCAP_DIST_FOLDER__: string;
}

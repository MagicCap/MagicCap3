import React from "react";
import styled from "styled-components";
import { JSONValue } from "../../../sharedTypes";
import { getConfig, writeConfig } from "../../utils/api_cache";
import Button from "./Button";
import Editor from "./Editor";

type ConfigFileProps = {
    configKey: string;
    name: string;
    loader?: (v: JSONValue) => string;
    parser?: (s: string) => JSONValue;
};

type ConfigSubProps = ConfigFileProps & {
    setContent: (s: string | null) => void;
};

const ErrorMessage = styled.p`
    font-size: 10px;
    color: red;
`;

const NoFile = ({name, parser, loader, configKey, setContent}: ConfigSubProps) => {
    const [message, setMessage] = React.useState<string | null>();
    const [editorVisible, setEditorVisible] = React.useState(false);
    return <>
        {
            message !== null ? <ErrorMessage>{message}</ErrorMessage> : null
        }

        <p>
            <input type="file" onChange={e => {
                const files = (e.target as any).files as FileList;
                (async () => {
                    if (files.length === 1) {
                        // Get the text of the file.
                        const text = await files[0].text();
                        try {
                            // Try and parse it and then write it to the config.
                            let res: JSONValue;
                            if (parser) res = parser(text);
                            else res = text;
                            const o: {[key: string]: JSONValue | undefined} = {};
                            o[configKey] = res;
                            await writeConfig(o);
                            setContent(loader ? loader(res) : text);
                        } catch (e: any) {
                            // Throw the error.
                            setMessage(e.message !== undefined ? e.message : e);
                            return;
                        }
                    }
                })();
            }} />

            <Button alt="Open Editor" color="#404040" onClick={() => setEditorVisible(true)} whiteText={true}>
                Open Editor
            </Button>
        </p>

        {
            editorVisible ? <Editor title={`Editing ${name}`} content="" onComplete={async textOrNull => {
                // Hide the editor.
                setEditorVisible(false);

                // Return here if this was closed.
                if (textOrNull === null) return;

                try {
                    // Try and parse it and then write it to the config.
                    let res: JSONValue;
                    if (parser) res = parser(textOrNull);
                    else res = textOrNull;
                    const o: {[key: string]: JSONValue | undefined} = {};
                    o[configKey] = res;
                    await writeConfig(o);
                    setContent(loader ? loader(res) : textOrNull);
                } catch (e: any) {
                    // Throw the error.
                    setMessage(e.message !== undefined ? e.message : e);
                }
            }} /> : null
        }
    </>;
};

type FileProps = ConfigSubProps & {
    content: string;
};

const File = ({configKey, name, content, parser, loader, setContent}: FileProps) => {
    const [editorText, setEditorText] = React.useState<string | null>(null);
    const [message, setMessage] = React.useState<string | null>(null);
    return <>
        {
            message !== null ? <ErrorMessage>{message}</ErrorMessage> : null
        }

        {editorText !== null ? <Editor title={`Editing ${name}`} content={editorText} onComplete={async textOrNull => {
                // Hide the editor.
                setEditorText(null);

                // Return here if this was closed.
                if (textOrNull === null) return;

                try {
                    // Try and parse it and then write it to the config.
                    let res: JSONValue;
                    if (parser) res = parser(textOrNull);
                    else res = textOrNull;
                    const o: {[key: string]: JSONValue | undefined} = {};
                    o[configKey] = res;
                    await writeConfig(o);
                    setContent(loader ? loader(res) : textOrNull);
                } catch (e: any) {
                    // Throw the error.
                    setMessage(e.message !== undefined ? e.message : e);
                }
        }} /> : null}

        <p>
            <Button alt="Unset Configuration Option" color="#404040" onClick={async () => {
                const o: {[key: string]: JSONValue | undefined} = {};
                o[configKey] = undefined;
                await writeConfig(o);
                setContent(null);
            }} whiteText={true}>
                Unset Configuration Option
            </Button>

            <Button alt="Open Editor" color="#404040" onClick={() => setEditorText(content)} whiteText={true}>
                Open Editor
            </Button>
        </p>
    </>;
};

export default (props: ConfigFileProps) => {
    // Defines the used props.
    const {configKey, name} = props;

    // Defines the content.
    const [content, setContent] = React.useState<string | null>(null);

    // Set the content.
    React.useEffect(() => {
        getConfig().then(config => {
            const res = config[configKey];
            if (res === undefined) {
                // Make sure the content is null.
                setContent(null);
            } else {
                // Set the content as a string.
                setContent(props.loader ? props.loader(res) : res as string);
            }
        });
    }, []);

    // Return the items.
    return <>
        <p>
            <b>{name}:</b>
        </p>
        {
            content === null ? <NoFile {...props} setContent={setContent} /> :
            <File {...props} content={content} setContent={setContent} />
        }
        <br />
    </>;
};

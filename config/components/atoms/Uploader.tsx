import React from "react";
import Container from "./Container";
import ConfigCheckbox from "./ConfigCheckbox";
import ConfigText from "./ConfigText";
import ConfigNumber from "./ConfigNumber";
import ConfigFile from "./ConfigFile";
import { Notification, NotificationProps } from "./Notification";
import Button from "./Button";
import { JSONableUploaderDetails, UploaderOption } from "../../../sharedTypes";
import { getConfig, writeConfig } from "../../utils/api_cache";
import { urlValidator } from "../../utils/validators";
import { jsonLoader } from "../../utils/loaders";
import { jsonParser } from "../../utils/parsers";
import ConfigEnum from "./ConfigEnum";
import ConfigOAuth2 from "./ConfigOAuth2";

type UploaderProps = {
    back: () => void;
    uploaderId: string;
    uploader: JSONableUploaderDetails;
};

export default ({back, uploader, uploaderId}: UploaderProps) => {
    // Defines the active notification.
    const [notification, setNotification] = React.useState<{props: NotificationProps; text: string} | null>(null);

    // The renderer for options.
    let renderOption: (option: UploaderOption, index: number | string) => JSX.Element;
    renderOption = (option: UploaderOption, index: number | string) => {
        switch (option.type) {
            case "boolean":
                return <ConfigCheckbox
                    configKey={option.key}
                    defaultBehaviour={option.default!}
                    description={option.name}
                    key={index}
                />;
            case "file":
                return <ConfigFile
                    configKey={option.key}
                    name={option.name}
                    key={index}
                />;
            case "json":
                return <ConfigFile
                    configKey={option.key}
                    name={option.name}
                    loader={jsonLoader}
                    parser={jsonParser}
                    key={index}
                />;
            case "object":
                //return <ConfigStringObject
                //    configKey={option.key}
                //    name={option.name}
                //    key={index}
                ///>;
                throw new Error("object is not implemented");
            case "password":
                return <ConfigText
                    configKey={option.key}
                    name={option.name}
                    defaultText={undefined}
                    password={true}
                    nullable={!option.required}
                    key={index}
                />;
            case "text":
                return <ConfigText
                    configKey={option.key}
                    name={option.name}
                    defaultText={option.default}
                    password={false}
                    nullable={!option.required}
                    key={index}
                />;
            case "int":
                return <ConfigNumber
                    configKey={option.key}
                    name={option.name}
                    defaultNumber={option.default}
                    nullable={!option.required}
                    unsigned={false}
                    key={index}
                    min={option.min}
                    max={option.max}
                />;
            case "uint":
                return <ConfigNumber
                    configKey={option.key}
                    name={option.name}
                    defaultNumber={option.default}
                    nullable={!option.required}
                    unsigned={true}
                    key={index}
                    min={option.min}
                    max={option.max}
                />;
            case "url":
                return <ConfigText
                    configKey={option.key}
                    name={option.name}
                    defaultText={option.default}
                    password={false}
                    validator={urlValidator}
                    nullable={!option.required}
                    key={index}
                />;
            case "enum":
                return <ConfigEnum
                    configKey={option.key}
                    options={option.options}
                    key={index}
                    defaultIndex={option.default}
                    conditional={{
                        renderer: renderOption,
                        options: option.conditional
                    }}
                />;
            case "oauth2":
                return <ConfigOAuth2
                    configKey={option.key}
                    authorizationUrl={option.authorizationUrl}
                    clientIdKey={option.clientIdKey}
                    name={option.name}
                    uploaderKey={uploaderId}
                    accessType={option.accessType}
                    scope={option.scope}
                    key={index}
                />;
            default:
                throw new Error("unknown type");
        }
    };

    // Return the uploader options.
    return <Container>
        {
            notification ? <Notification {...notification.props}>{notification.text}</Notification> : null
        }
        <h1>{uploader.name} Settings</h1>
        <p>{uploader.description}</p>
        {
            uploader.options.map((option, index) => renderOption(option, index))
        }
        {uploader.options.length === 0 ? <p>No configuration items are set.</p> : null}
        <p>
            <Button alt="Set as Default Uploader" color="#00FF00" whiteText={false} onClick={async () => {
                // Process the options.
                const config = await getConfig();
                for (const option of uploader.options) {
                    const val = config[option.key];
                    if (val === undefined) {
                        // Check if the item doesn't have a default/is required.
                        if (option.required && option.default === undefined) {
                            setNotification({
                                props: {
                                    backgroundColor: "#C41616",
                                    textColor: "white"
                                },
                                text: "Not all uploader options are set."
                            });
                            return;
                        }
                    }

                    // In the event that this is a enum, check any sub-options.
                    if (option.type === "enum" && option.conditional) {
                        const keyIndex = val === undefined ? option.default : val as number;
                        if (keyIndex !== undefined) {
                            const subOptions = option.conditional[option.options[keyIndex]];
                            for (const subOption of subOptions || []) {
                                if (subOption.required && subOption.default === undefined) {
                                    setNotification({
                                        props: {
                                            backgroundColor: "#C41616",
                                            textColor: "white"
                                        },
                                        text: "Not all uploader options are set."
                                    });
                                    return;
                                }
                            }
                        }
                    }
                }

                // Write the uploader.
                writeConfig({uploader_type: uploaderId});
                setNotification({
                    props: {
                        backgroundColor: "#00A300",
                        textColor: "white"
                    },
                    text: "Uploader successfully set as default"
                });
            }}>
                Set as Default Uploader
            </Button>
            <Button alt="Return to Uploaders" color="#404040" onClick={back} whiteText={true}>
                Return to Uploaders
            </Button>
        </p>
    </Container>;
};

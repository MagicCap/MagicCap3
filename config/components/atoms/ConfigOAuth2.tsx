import React from "react";
import styled from "styled-components";
import { JSONValue } from "../../../sharedTypes";
import { getConfig, writeConfig } from "../../utils/api_cache";
import { cancelOAuth2Flow, openOAuth2Flow } from "../../utils/main_api";
import Pointer from "../../utils/pointer";

const ErrorMessage = styled.p`
    font-size: 10px;
    color: red;
`;

const ColoredLink = styled.a`
    color: dodgerblue;
`;

type OAuth2Props = {
    name: string;
    uploaderKey: string;
    configKey: string;
    authorizationUrl: string;
    clientIdKey: string;
    scope?: string;
    accessType?: string;
};

export default ({name, uploaderKey, configKey, authorizationUrl, clientIdKey, scope, accessType}: OAuth2Props) => {
    // Defines any error messages.
    const [message, setMessage] = React.useState<string | null>();

    // Defines the status.
    const [status, setStatus] = React.useState<number>(0);

    // Handle the active flow ID.
    const [flowId] = React.useState<Pointer<string | null>>({to: null});
    React.useEffect(() => {
        return () => {
            if (flowId.to !== null) cancelOAuth2Flow(flowId.to);
        };
    }, []);

    // Handle checking for presence of the key.
    React.useEffect(() => {
        getConfig().then(config => {
            if (config[configKey] !== undefined) setStatus(1);
        });
    }, []);

    // Initialise the OAuth2 flow.
    const initOAuth = () => {
        getConfig().then(c => {   
            const clientId = c[clientIdKey] as string;
            if (clientId === undefined) {
                setMessage("No client ID found.");
                return;
            }
            openOAuth2Flow(uploaderKey, configKey, {
                authorizationUrl, clientId, scope, accessType,
            }, async (err, res) => {
                if (err) { 
                    setMessage(err);
                    setStatus(0);
                } else {
                    setMessage("");
                    setStatus(1);
                }
                flowId.to = null;
                if (!err) {
                    const x: {[key: string]: JSONValue} = {};
                    x[configKey] = res;
                    await writeConfig(x);
                }
            }).then(x => {
                flowId.to = x;
                setMessage("");
                setStatus(2);
            }).catch(err => setMessage(err.message));
        });
    };

    // Cancel the OAuth2 flow.
    const cancelOAuth = () => {
        cancelOAuth2Flow(flowId.to!);
        flowId.to = null;
        setMessage("");
        setStatus(0);
    };

    // Remove the OAuth2 token.
    const removeOAuth = () => {
        const o: any = {};
        o[configKey] = undefined;
        writeConfig(o).then(() => setStatus(0));
    };

    // List all possible components.
    const relevantComponent = [
        // Displayed when no OAuth2 token is set.
        <ColoredLink onClick={initOAuth}>Click here to configure.</ColoredLink>,

        // Displayed when a OAuth2 token is set.
        <>OAuth2 token is set. <ColoredLink onClick={removeOAuth}>Click here to remove.</ColoredLink></>,

        // Displayed when a OAuth2 flow is in progress.
        <>OAuth2 authentication in progress. <ColoredLink onClick={cancelOAuth}>Click here to cancel.</ColoredLink></>,
    ];

    // Return all the parts.
    return <>
        {
            message !== null ? <ErrorMessage>{message}</ErrorMessage> : null
        }

        <label>
            {name}:<span style={{marginRight: "10px"}} />
            {
                relevantComponent[status]
            }
        </label>
    </>;
};

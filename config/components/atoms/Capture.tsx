import React from "react";
import styled from "styled-components";
import { Capture } from "../../../sharedTypes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faClipboard, faFolder, faFile, faNetworkWired, faTrash } from "@fortawesome/free-solid-svg-icons";
import Tooltip from "./Tooltip";
import Debouncer from "../../utils/debouncer";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { validatedFileRemoval, validatedFileOpen, validatedFolderOpen, validatedUrlOpen } from "../../utils/main_api";

type CaptureProps = {
    capture: Capture;
    deleteCapture: () => void;
};

type CaptureBoxProps = {
    backgroundFile: string | null;
    backgroundUrl: string | null;
};

const noFile = "";

const CaptureBox = styled.div`
    display: inline-block;
    width: 150px;
    height: 100px;
    margin: 5px;
    filter: drop-shadow(5px 5px 3px black);
    background-size: cover;
    background-image: url("${
        (props: CaptureBoxProps) => props.backgroundFile === null ? props.backgroundUrl === null ?
            noFile : props.backgroundUrl : `file://${encodeURI(props.backgroundFile)}`
    }");
`;

type CaptureInfoProps = {
    success: boolean;
};

const CaptureInfoContainer = styled.div`
    height: 50%;
    background-color: rgba(${(props: CaptureInfoProps) => props.success ? "47, 149, 22" : "59, 122, 14"}, 0.9);
    margin-top: 34%;
    text-align: left;
    user-select: none;
    color: white;

    * {
        font-family: 'Roboto', sans-serif;
    }
`;

const CaptureFilename = styled.div`
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 5px;
`;

const CaptureTime = styled.div`
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
`;

type PossibleGreyProps = {
    enabled: boolean;
    icon: IconProp;
    onClick: () => void;
};

const PossibleGrey = ({icon, enabled, onClick}: PossibleGreyProps) => {
    if (!enabled) return <a><FontAwesomeIcon icon={icon} color="grey" /></a>;
    return <a onClick={onClick}><FontAwesomeIcon icon={icon} /></a>;
};

const writeClipboard = (capture: Capture) => {
    navigator.clipboard.writeText(capture.url!);
};

const openCaptureBrowser = (capture: Capture) => {
    validatedUrlOpen(capture.url!, capture.timestamp);
};

const openCaptureFolder = (capture: Capture) => {
    validatedFolderOpen(capture.filePath!, capture.timestamp);
};

const openCaptureFile = (capture: Capture) => {
    validatedFileOpen(capture.filePath!, capture.timestamp);
};

const CaptureOpts = ({capture, deleteCapture}: CaptureProps) => <CaptureTime style={{margin: "3px", marginLeft: "8px", fontSize: "14px"}}>
    <Tooltip content="Copy link to clipboard">
        <PossibleGrey enabled={!!capture.url} onClick={() => writeClipboard(capture)} icon={faClipboard} />
        &nbsp;&nbsp;
    </Tooltip>
    <Tooltip content="Open capture in browser">
        <PossibleGrey enabled={!!capture.url} onClick={() => openCaptureBrowser(capture)} icon={faNetworkWired} />
        &nbsp;&nbsp;
    </Tooltip>
    <Tooltip content="Open capture in folder">
        <PossibleGrey enabled={!!capture.filePath} onClick={() => openCaptureFolder(capture)} icon={faFolder} />
        &nbsp;&nbsp;
    </Tooltip>
    <Tooltip content="Open capture file">
        <PossibleGrey enabled={!!capture.filePath} onClick={() => openCaptureFile(capture)} icon={faFile} />
        &nbsp;&nbsp;
    </Tooltip>
    <Tooltip content="Delete capture">
        <a onClick={() => deleteCapture()}>
            <FontAwesomeIcon icon={faTrash} />
        </a>
    </Tooltip>
</CaptureTime>;

export default ({capture, deleteCapture}: CaptureProps) => {
    const [hovering, setHovering] = React.useState(false);
    const [debouncer, setDebouncer] = React.useState<Debouncer | null>(null);
    React.useEffect(() => {
        setDebouncer(new Debouncer());
    }, []);
    return <>
        <CaptureBox
            backgroundFile={!capture.filePath ? null : capture.filePath}
            backgroundUrl={!capture.url ? null : capture.url}
            onMouseOver={() => debouncer!.debounce(() => setHovering(true))}
            onMouseLeave={() => debouncer!.debounce(() => setHovering(false))}
        >
            <CaptureInfoContainer success={capture.success}>
                <CaptureFilename>{capture.filename}</CaptureFilename>
                {
                    hovering
                    ? <CaptureOpts capture={capture} deleteCapture={deleteCapture} />
                    : <CaptureTime style={{margin: "5px"}}><FontAwesomeIcon icon={faClock} /> {new Date(capture.timestamp).toLocaleString()}</CaptureTime>
                }
            </CaptureInfoContainer>
        </CaptureBox>
    </>;
};

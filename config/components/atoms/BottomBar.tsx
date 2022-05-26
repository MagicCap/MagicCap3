import React from "react";
import styled from "styled-components";

type BottomBarProps = {
    currentlySelected: number;
    setCurrentlySelected: (i: number) => void;
};

const buttons = [
    "Captures",
    "Uploaders",
    "File Saving",
    "Hotkeys",
    "General",
];

const Button = styled.span`
    font-size: 20px;
    font-family: 'Roboto', sans-serif;
    padding-right: 20px;
    user-select: none;

    &:hover {
        color: #CAC7C6 !important;
    }
`;

const Buttons = ({currentlySelected, setCurrentlySelected}: BottomBarProps) => <>{buttons.map((content, key) => {
    return <Button onClick={() => {
        // Just set the key.
        setCurrentlySelected(key);

        if (currentlySelected === key) {
            // Force a refresh.
            const [, setRefreshHack] = React.useState(0);
            setRefreshHack(val => val + 1);
        }
    }} style={currentlySelected === key ? {color: "white"} : {color: "#818181"}} key={key}>
        {content}
    </Button>;
})}</>;

export default ({currentlySelected, setCurrentlySelected}: BottomBarProps) => {
    return <div style={{
        backgroundColor: "rgb(18,18,16)", padding: "5px",
        display: "flex", justifyContent: "space-between",
        flexShrink: 0,
    }}>
        <span style={{
            flexFlow: "left", paddingLeft: "5px",
            alignSelf: "center",
        }}>
            <Buttons currentlySelected={currentlySelected} setCurrentlySelected={setCurrentlySelected} />
        </span>
        <span style={{flexFlow: "right", alignItems: "right", justifyContent: "right", paddingRight: "5px"}}>
            <img aria-hidden={true} src={`file://${__dirname.replace(/dist$/, "assets")}/Logotype Light.png`} style={{height: "10vh"}} draggable={false} />
        </span>
    </div>;
};

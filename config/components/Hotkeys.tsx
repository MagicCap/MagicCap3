import React from "react";
import Container from "./atoms/Container";
import Hotkey from "./atoms/Hotkey";

export default () => <Container>
    <h1>Hotkey Configuration</h1>

    <Hotkey
        configKey="hotkey"
        name="Capture Hotkey"
    />
    <Hotkey
        configKey="gif_hotkey"
        name="GIF Hotkey"
    />
    <Hotkey
        configKey="clipboard_hotkey"
        name="Clipboard Hotkey"
    />
    <Hotkey
        configKey="multi_display_hotkey"
        name="Multi Display Capture Hotkey"
    />
</Container>;

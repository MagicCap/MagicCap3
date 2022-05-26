import React from "react";
import Modal from "./Modal";
import AceEditor from "react-ace";
import Button from "./Button";

import "ace-builds/src-noconflict/theme-github";

type EditorProps = {
    title: string;
    content: string;
    onComplete: (content: string | null) => void;
};

export default ({title, content, onComplete}: EditorProps) => {
    const [text, setText] = React.useState(content);
    return <Modal onClose={() => onComplete(null)} title={title}>
        <AceEditor
            value={text}
            placeholder={title}
            theme="github"
            onChange={newVal => setText(newVal)}
            style={{
                width: "100%",
                height: "40vh",
                marginBottom: "20px",
            }}
        />
        <Button alt="Save Changes" color="#1670C4" whiteText={true} onClick={() => onComplete(text)}>
            Save Changes
        </Button>
    </Modal>;
};

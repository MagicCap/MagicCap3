import React from "react";
import Banner from "./atoms/Banner";
import LoadingWheel from "./atoms/LoadingWheel";
import CaptureComponent from "./atoms/Capture";
import Modal from "./atoms/Modal";
import Button from "./atoms/Button";
import Container from "./atoms/Container";
import { databaseExec, databaseQuery, validatedFileRemoval } from "../utils/main_api";
import { Capture } from "../../sharedTypes";

declare global {
    const onCapture: (f: (data: Capture) => any) => () => void;
}

export default () => {
    // Defines if we're still loading.
    const [loading, setLoading] = React.useState(true);

    // Defines the captures.
    let [captures, setCaptures] = React.useState<Capture[]>([]);

    // Defines the selected capture.
    const [capture, setCapture] = React.useState<Capture | null>(null);

    // Defines the index of the capture.
    const [captureIndex, setCaptureIndex] = React.useState(0);

    // Defines the delete checkbox.
    const [checkbox, setCheckbox] = React.useState(false);

    // Load the captures from the API.
    React.useEffect(() => {
        let cb = (): void => {};
        databaseQuery("SELECT * FROM captures ORDER BY timestamp DESC").then(items => {
            captures = items.map(x => {
                return {
                    filePath: x.file_path as string,
                    filename: x.filename as string,
                    success: x.success === 1,
                    url: x.url as string,
                    timestamp: x.timestamp as number
                };
            });
            setCaptures(captures);
            setLoading(false);
            cb = onCapture((data: Capture) => {
                captures = [data, ...captures];
                setCaptures(captures);
            });
        });
        return cb;
    }, []);

    // If we're loading, return the spinning wheel.
    if (loading) return <Banner title="Loading captures..." subtitle="This may take time if you have a lot of items.">
        <LoadingWheel />
    </Banner>;

    // Handle doing a destroy.
    const doDestroy = async () => {
        if (checkbox) {
            try {
                await validatedFileRemoval(capture!.filePath!, capture!.timestamp);
            } catch (e) {
                console.error(e);
            }
        }
        await databaseExec("DELETE FROM captures WHERE timestamp = ?", capture!.timestamp);
        captures = [...captures.slice(0, captureIndex), ...captures.slice(captureIndex + 1)];
        setCaptures(captures);
        setCapture(null);
    };

    // Map all the captures.
    return <>
        {
            capture ? <Container>
                <Modal title="Delete Capture" onClose={() => setCapture(null)}>
                    <p>Do you want to remove this capture?</p>
                    {
                        capture.filePath ? <>
                            <input type="checkbox" checked={checkbox} onChange={() => setCheckbox(!checkbox)} />
                            <label>Delete From Disk</label>
                        </> : null
                    }
                    <p>
                        <Button alt="Confirm" whiteText={true} color="#a82828" onClick={doDestroy}>
                            Confirm
                        </Button>
                    </p>
                </Modal>
            </Container> : null
        }

        <div style={{textAlign: "center", width: "100%", margin: "5px"}}>{captures.map((x, i) => <CaptureComponent capture={x} deleteCapture={() => {
            setCapture(x);
            setCaptureIndex(i);
        }} key={i} />)}</div>
    </>;
};

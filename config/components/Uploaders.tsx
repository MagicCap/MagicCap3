import React from "react";
import { decode } from "base64-arraybuffer";
import { JSONableUploaderDetails } from "../../sharedTypes";
import { getUploaders } from "../utils/main_api";
import ConfigCheckbox from "./atoms/ConfigCheckbox";
import Container from "./atoms/Container";
import LoadingWheel from "./atoms/LoadingWheel";
import Button from "./atoms/Button";
import Uploader from "./atoms/Uploader";

const UploaderButton = ({uploader, onClick}: {uploader: JSONableUploaderDetails, onClick: () => void}) => {
    return <Button alt={uploader.name} color="#404040" whiteText={true} onClick={onClick}>
        <img aria-hidden={true} style={{borderRadius: "50%", height: "15px", paddingRight: "3px", paddingBottom: "2px", display: "inline", verticalAlign: "bottom"}} src={uploader.icon} />{uploader.name}
    </Button>;
};

const UploaderList = ({setUploader}: {setUploader: (obj: {id: string; u: JSONableUploaderDetails}) => void}) => {
    // Defines the uploaders.
    const [uploaders, setUploaders] = React.useState<{[id: string]: JSONableUploaderDetails}>({});

    // Create an effect to handle uploaders.
    React.useEffect(() => {
        getUploaders().then(uploaderObj => {
            // Get the blob.
            for (const key in uploaderObj) {
                const val = uploaderObj[key];
                val.icon = URL.createObjectURL(new Blob([decode(val.icon)], {type: "image/png"}));
            }

            // Set the object.
            setUploaders(uploaderObj);
        });
    }, []);

    // If there's no uploaders, return a blank component.
    if (Object.keys(uploaders).length === 0) return <LoadingWheel />;

    // Map the categories.
    const catMap: Map<string, {id: string; uploader: JSONableUploaderDetails}[]> = new Map();
    for (const id in uploaders) {
        const uploader = uploaders[id];
        const res = catMap.get(uploader.category.name);
        if (res) {
            // Append to the map.
            res.push({id, uploader});
        } else {
            // Set on the map.
            catMap.set(uploader.category.name, [{id, uploader}]);
        }
    }

    // Go through each category name in alphabetical order and render it.
    const components = [...catMap.keys()].sort().map((catName, catKey) => {
        // Get the array.
        const array = catMap.get(catName);

        // Get the description.
        const catDesc = array![0]!.uploader.category.description;

        // Go through each uploader.
        const uploaderComponents = array!
            .sort((a, b) => a.uploader.name.localeCompare(b.uploader.name))
            .map((uploader, uploaderKey) => <React.Fragment key={uploaderKey}>
                <UploaderButton
                    uploader={uploader.uploader}
                    onClick={() => setUploader({
                        id: uploader.id, u: uploader.uploader
                    })}
                />{" "}
            </React.Fragment>);

        // Return the fragment.
        return <React.Fragment key={catKey}>
            <h2>{catName}</h2>
            <p>{catDesc}</p>
            <p style={{overflowWrap: "normal"}}>{uploaderComponents}</p>
        </React.Fragment>;
    });

    // Return all the components in a base fragment.
    return <>{components}</>;
};

export default () => {
    // Defines the state for the uploader.
    const [uploader, setUploader] = React.useState<{id: string; u: JSONableUploaderDetails} | null>(null);

    // If a uploader is set, return the uploader component.
    if (uploader) return <Uploader back={() => setUploader(null)} uploaderId={uploader.id} uploader={uploader.u} />;

    // If no uploader is selected, return the default container.
    return <Container>
        <h1>Uploaders Configuration</h1>

        <ConfigCheckbox
            configKey="upload_capture"
            description="Upload the capture when it is done."
            defaultBehaviour={true}
        />
        <ConfigCheckbox
            configKey="upload_open"
            description="Open the uploaded capture in your browser if successful."
            defaultBehaviour={false}
        />

        <UploaderList setUploader={setUploader} />
    </Container>;
};

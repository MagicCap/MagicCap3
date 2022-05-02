import styled from "styled-components";

type ButtonProps = {
    alt: string;
    color: string;
    whiteText: boolean;
    onClick: () => void;
};

export default styled.a`
    background-color: ${(props: ButtonProps) => props.color};
    padding: 5px;
    color: ${(props: ButtonProps) => props.whiteText ? "white" : "#818181"};
    user-select: none;
    font-family: 'Roboto', sans-serif;
    border-radius: 5px;

    &:hover {
        filter: brightness(85%);
    }

    &:not(:last-child) {
        margin-right: 5px;
    }
`;

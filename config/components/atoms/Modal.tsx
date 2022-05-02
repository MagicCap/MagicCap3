import React from "react";
import styled from "styled-components";

const Modal = styled.div`
    display: block;
    position: absolute;
    z-index: 1;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: black;
    overflow: auto;
    background-color: rgb(0,0,0);
    background-color: rgba(0,0,0,0.4);
`;

const ModalContent = styled.div`
    position: relative;
    background-color: black;
    margin: auto;
    margin-top: 5%;
    height: 80%;
    padding: 0;
    padding-bottom: 16px;
    border: 1px solid #888;
    width: 80%;
    box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2),0 6px 20px 0 rgba(0,0,0,0.19);
    animation-name: animatetop;
    animation-duration: 0.4s;
`;

const ModalHeader = styled.div`
    padding: 2px 16px;
    background-color: black;
    color: white;
`;

const ModalClose = styled.span`
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;

    &:hover, &:focus {
        color: white;
        text-decoration: none;
    }
`;

type ModalProps = {
    onClose: () => void;
    title: string;
    children: React.ReactNode;
};

export default ({onClose, title, children}: ModalProps) => <Modal>
    <ModalContent>
        <ModalHeader>
            <ModalClose onClick={onClose}>&times;</ModalClose>
            <h2>{title}</h2>
        </ModalHeader>
        <div style={{padding: "2px 16px"}}>
            {children}
        </div>
    </ModalContent>
</Modal>;

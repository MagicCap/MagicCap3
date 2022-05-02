import styled from "styled-components";

export type NotificationProps = {
    backgroundColor: string;
    textColor: string;
};

export const Notification = styled.p`
    background-color: ${(props: NotificationProps) => props.backgroundColor};
    padding: 10px;
    font-color: ${(props: NotificationProps) => props.textColor};
`;

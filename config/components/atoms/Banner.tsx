import React from "react";

type BannerProps = {
    title: string;
    subtitle: string;
    children: React.ReactNode;
};

export default ({title, subtitle, children}: BannerProps) => {
    return <div style={{textAlign: "center", paddingTop: "10px", color: "white", fontFamily: "'Roboto', sans-serif"}}>
        {children}
        <h2>{title}</h2>
        <p>{subtitle}</p>
    </div>;
};

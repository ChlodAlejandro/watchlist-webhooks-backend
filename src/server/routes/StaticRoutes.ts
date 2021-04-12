import Route from "./Route";
import path from "path";
import express from "express";

export default <Route[]>[
    {
        path: "/",
        middleware: express.static(path.resolve(__dirname, "..", "static", "main"))
    },
    {
        path: "/cookies",
        middleware: express.static(path.resolve(__dirname, "..", "static", "cookies"))
    },
    {
        path: "/error",
        middleware: express.static(path.resolve(__dirname, "..", "static", "error"))
    }
];

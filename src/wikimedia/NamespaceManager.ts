/**
 * The API interpretation of a namespace.
 */
import WikimediaURL from "./WikimediaURL";
import axios from "axios";
import WWBackend from "../WWBackend";

export interface Namespace {
    id: number;
    case: string;
    name: string;
    subpages: boolean;
    canonical: string;
    content: boolean;
    nonincludable: boolean;
}

/**
 * Tracks namespaces used on Wikimedia projects.
 */
export default class NamespaceManager {

    /**
     * The namespace matrix is a collection of every single project
     * mapped to their respective namespace sets.
     */
    public static readonly namespaceMatrix : Record<string, Record<number, Namespace>> = {};

    /**
     * Gets the namespaces of a project.
     * @param project
     */
    static async getNamespaces(project : string) : Promise<Record<number, Namespace>> {
        if (NamespaceManager.namespaceMatrix[project] != null)
            return NamespaceManager.namespaceMatrix[project];

        const namespacesRequest = await axios({
            method: "get",
            url: WikimediaURL.actionApi(project),
            params: {
                "action": "query",
                "meta": "siteinfo",
                "siprop": "namespaces"
            },
            responseType: "json"
        });

        const namespacesData : { [key : string]: Namespace } =
            namespacesRequest.data["query"]["namespaces"];

        const namespaceMatrix = {};
        for (const namespace of Object.values(namespacesData)) {
            namespaceMatrix[namespace.id] = namespace;
        }

        WWBackend.log.trace(
            `Received namespaces for project: ${project}.`,
            Object.values(namespacesData).map(n => `${n.id}:${n.name}`).join(", ")
        );

        return (NamespaceManager.namespaceMatrix[project] = namespaceMatrix);
    }

    /**
     * Gets the subject namespaces of a project.
     */
    static async getSubjectNamespaces(project : string) : Promise<Record<number, Namespace>> {
        const namespaces = await this.getNamespaces(project);

        // Subject namespaces are denoted with even numbers.
        // https://www.mediawiki.org/wiki/Manual:Namespace
        return Object.values(namespaces)
            .filter(v => v.id % 2 == 0 && v.id > -1)
            .reduce(
                (prev : Record<number, Namespace>, v : Namespace) => {
                    prev[v.id] = v;
                    return prev;
                },
                <Record<number, Namespace>>{}
            );
    }

    /**
     * Gets the talk namespaces of a project.
     */
    static async getTalkNamespaces(project : string) : Promise<Record<number, Namespace>> {
        const namespaces = await this.getNamespaces(project);

        // Talk namespaces are denoted with odd numbers.
        return Object.values(namespaces)
            .filter(v => v.id % 2 == 1 && v.id > -1)
            .reduce(
                (prev : Record<number, Namespace>, v : Namespace) => {
                    prev[v.id] = v;
                    return prev;
                },
                <Record<number, Namespace>>{}
            );
    }

}
/**
 * The API interpretation of a namespace.
 */
import WikimediaURL from "./WikimediaURL";
import axios from "axios";

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

        return (NamespaceManager.namespaceMatrix[project] = namespaceMatrix);
    }


}
const environmentVariableChecks : {
    [key : string]: boolean | ((value : string) => boolean)
} = {
    "WMWW_WM_CONSUMER_KEY": true,
    "WMWW_WM_CONSUMER_TOKEN": true,
    "WMWW_SQL_HOSTNAME": true,
    "WMWW_SQL_USERNAME": true,
    "WMWW_SQL_DATABASE": true,
    "WMWW_SQL_PORT": (value) => value == null || !isNaN(+(value)),
    "WMWW_HTTP_PORT": (value) => value == null || !isNaN(+(value)),
};

/**
 * Utilities for the execution environment.
 */
export default class EnvironmentUtils {

    /**
     * Checks if the given environment variables are assigned and
     * not empty. If the given check has a validation function, it
     * will also check the value of that environment variable
     * against the validation function.
     *
     * @returns false if the environment is clear for use. Otherwise,
     *          a list of failing environment variables.
     */
    static checkEnvironment() : false | string[] {
        const erring = [];

        for (const [variable, check] of Object.entries(environmentVariableChecks)) {
            if (
                (
                    check === true &&
                    (process.env[variable] == null || process.env[variable].length == 0)
                )
                || (typeof check === "function" && !check(process.env[variable]))
            )
                erring.push(variable);
        }

        return erring.length > 0 ? erring : false;
    }

}
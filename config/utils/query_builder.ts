import { databaseExec } from "./main_api";

export const insert = (table: string, items: {[key: string]: any}) => {
    let query = "INSERT INTO " + table + " (";
    const values: any[] = [];
    const keys = Object.keys(items);
    keys.forEach((key, index) => {
        query += key;
        values.push(items[key]);
        if (index === keys.length - 1) {
            query += ") VALUES (";
        } else {
            query += ", ";
        }
    });
    query += keys.map(() => "?").join(", ") + ")";
    return databaseExec(query, ...values);
};

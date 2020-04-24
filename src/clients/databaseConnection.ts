import {createConnection, getConnectionOptions} from "typeorm";

export const connectDatabase = async () => {
    const connectionOptions = await getConnectionOptions();
    Object.assign(connectionOptions, { entities: [__dirname + '/models/*'] });
    return await createConnection(connectionOptions);
}

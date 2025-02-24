import { DuckDBClient } from './duckdbClient';

export class DuckDBService {
    private client: DuckDBClient;

    constructor() {
        this.client = new DuckDBClient();
    }

    public async executeSql(sql: string) {
        console.log("SQL: " + sql)
        try {
            const result = await this.client.execute(sql);
            console.log('Execute SQL Result:', result); // 結果を確認
            return result;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`SQL execution failed: ${error.message}`);
            } else {
                throw new Error('SQL execution failed: Unknown error');
            }
        }
    }
}

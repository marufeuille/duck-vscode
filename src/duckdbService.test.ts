import { DuckDBService } from './duckdbService';
import { DuckDBClient } from './duckdbClient';
import * as sinon from 'sinon';
import * as assert from 'assert';

describe('DuckDBService', () => {
    let duckDBService: DuckDBService;
    let executeStub: sinon.SinonStub;

    beforeEach(() => {
        duckDBService = new DuckDBService();
        executeStub = sinon.stub(DuckDBClient.prototype, 'execute');
    });

    afterEach(() => {
        executeStub.restore();
    });

    it('should execute SQL and return results', async () => {
        const mockResult = { columns: ['id', 'name'], rows: [[1, 'John Doe'], [2, 'Jane Doe']] };
        executeStub.resolves(mockResult);

        const result = await duckDBService.executeSql('SELECT * FROM test;');
        assert.deepStrictEqual(result, mockResult);
    });

    it('should throw an error if SQL execution fails', async () => {
        executeStub.rejects(new Error('SQL execution failed'));

        try {
            await duckDBService.executeSql('SELECT * FROM test;');
            assert.fail('Expected error was not thrown');
        } catch (error: any) {
            assert.strictEqual(error.message, 'SQL execution failed: SQL execution failed');
        }
    });
});

// src/duckdbClient.ts
import duckdb from 'duckdb';

export interface QueryResult {
  columns: string[];
  rows: any[];
}

export class DuckDBClient {
  private db: any;

  /**
   * データベースのパスを指定してインスタンスを生成します。
   * デフォルトはメモリ上のデータベース (":memory:") です。
   * @param databasePath 永続化する場合はファイルパスを指定します。
   */
  constructor(databasePath: string = ':memory:') {
    this.db = new duckdb.Database(databasePath);
  }

  /**
   * 指定された SQL クエリを実行し、結果を Promise で返します。
   * DuckDB のコールバック API を Promise 化しています。
   * また、BigInt 型の値は文字列に変換しています。
   * @param sql 実行する SQL クエリ
   */
  public execute(sql: string): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, (err: Error, rows: any[]) => {
        if (err) {
          return reject(err);
        }
        const columns = rows && rows.length > 0 ? Object.keys(rows[0]) : [];
        const data = rows.map(row =>
          Object.values(row).map(cell =>
            typeof cell === 'bigint' ? cell.toString() : cell
          )
        );
        resolve({ columns, rows: data });
      });
    });
  }
}
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { Db } from "@paperclipai/db";
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../errors.js";
import { parseTaskSearch, prepareTaskSearch, taskSearchCtes, taskSearchField, taskSearchFieldMatch } from "../services/task-search.js";

const dialect = new PgDialect();
const unicodeCatalog = [{ collname: "pg_unicode_fast", collprovider: "b" }];

function catalogDb(rows = unicodeCatalog) {
  const execute = vi.fn().mockResolvedValue(rows);
  return { db: { execute } as unknown as Db, execute };
}

describe("task search query intent", () => {
  it("keeps negation, short domain terms and quoted filler", () => {
    expect(parseTaskSearch('the API is not "in the UI"').tokens).toEqual(["api", "is", "not", "in the ui"]);
    expect(parseTaskSearch("the and").tokens).toEqual(["the", "and"]);
  });

  it("retains the strictest intent for repeated terms", () => {
    expect(parseTaskSearch('callback "callback"').terms).toEqual([{ text: "callback", quoted: true }]);
  });

  it("normalizes task identifiers without guessing their numbers", () => {
    for (const q of ["PAP-42", "pap42", "PAP 42"]) expect(parseTaskSearch(q).identifierQuery).toBe("pap-42");
    expect(parseTaskSearch("T123-42").identifierQuery).toBe("t123-42");
    expect(parseTaskSearch("PAP-420").identifierQuery).toBe("pap-420");
  });

  it("keeps ASCII search on its original SQL path without querying capabilities", async () => {
    const { db, execute } = catalogDb([]);
    const field = sql`issues.title`;
    for (const q of ["API", "GitHub OAuth", '"the API"', "%_\\", "PAP-42", "mibile", ""]) {
      const prepared = await prepareTaskSearch(db, q);
      expect(taskSearchField(field, prepared)).toBe(field);
      expect(dialect.sqlToQuery(taskSearchCtes("company-id", prepared)))
        .toEqual(dialect.sqlToQuery(taskSearchCtes("company-id", parseTaskSearch(q))));
    }
    expect(execute).not.toHaveBeenCalled();
  });

  it("shares an in-flight capability probe per database and caches successful resolution", async () => {
    const { db, execute } = catalogDb();
    await Promise.all([prepareTaskSearch(db, "Проверка"), prepareTaskSearch(db, "ёж")]);
    await prepareTaskSearch(db, "язык");
    expect(execute).toHaveBeenCalledTimes(1);
    const other = catalogDb([{ collname: "pg_c_utf8", collprovider: "b" }]);
    const search = await prepareTaskSearch(other.db, "Проверка");
    expect(other.execute).toHaveBeenCalledTimes(1);
    expect(dialect.sqlToQuery(taskSearchField(sql`title`, search)).sql).toContain('"pg_catalog"."pg_c_utf8"');
  });

  it("restricts candidates to deterministic catalog collations for the database encoding", async () => {
    const { db, execute } = catalogDb([
      { collname: "C.utf8", collprovider: "c" },
      { collname: "untrusted_collation", collprovider: "i" },
      { collname: "pg_unicode_fast", collprovider: "i" },
      { collname: "pg_c_utf8", collprovider: "b" },
    ]);
    const search = await prepareTaskSearch(db, "Проверка");
    const query = dialect.sqlToQuery(execute.mock.calls[0]![0]);
    expect(query.sql).toContain("n.nspname = 'pg_catalog' AND c.collisdeterministic");
    expect(query.sql).toContain("c.collencoding IN (-1, pg_catalog.pg_char_to_encoding(current_setting('server_encoding')))");
    expect(query.params).toEqual(["pg_unicode_fast", "pg_c_utf8", "unicode", "und-x-icu", "C.utf8", "C.UTF-8"]);
    expect(dialect.sqlToQuery(taskSearchField(sql`title`, search)).sql).toContain('"pg_catalog"."pg_c_utf8"');
  });

  it.each([
    ["pg_unicode_fast", "b"], ["pg_c_utf8", "b"], ["unicode", "i"],
    ["und-x-icu", "i"], ["C.utf8", "c"], ["C.UTF-8", "c"],
  ])("quotes the supported %s collation as one schema-qualified identifier", async (collname, collprovider) => {
    const { db } = catalogDb([{ collname, collprovider }]);
    const search = await prepareTaskSearch(db, "Проверка");
    expect(dialect.sqlToQuery(taskSearchField(sql`title`, search)))
      .toMatchObject({ sql: `(title COLLATE "pg_catalog"."${collname}")`, params: [] });
  });

  it("returns a typed capability error without disabling ASCII or caching an unsupported environment", async () => {
    const { db, execute } = catalogDb([]);
    await expect(prepareTaskSearch(db, "Проверка")).rejects.toMatchObject({
      status: 503, details: { code: "unicode_search_unavailable" },
    });
    await expect(prepareTaskSearch(db, "Проверка")).rejects.toBeInstanceOf(HttpError);
    expect(await prepareTaskSearch(db, "API")).toEqual(parseTaskSearch("API"));
    expect(execute).toHaveBeenCalledTimes(2);
    execute.mockResolvedValue(unicodeCatalog);
    await expect(prepareTaskSearch(db, "Проверка")).resolves.toMatchObject({ normalizedQuery: "проверка" });
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it("retries a failed capability query without hiding its original error", async () => {
    const { db, execute } = catalogDb();
    const error = new Error("connection interrupted");
    execute.mockRejectedValueOnce(error);
    await expect(prepareTaskSearch(db, "Проверка")).rejects.toBe(error);
    await expect(prepareTaskSearch(db, "Проверка")).resolves.toMatchObject({ normalizedQuery: "проверка" });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("rejects unprepared Unicode SQL and keeps SQL-looking search text parameterized", async () => {
    expect(() => taskSearchCtes("company-id", parseTaskSearch("Проверка"))).toThrow("must be prepared");
    expect(() => taskSearchFieldMatch(sql`title`, parseTaskSearch("Проверка"))).toThrow("must be prepared");
    const { db } = catalogDb();
    const search = await prepareTaskSearch(db, "Проверка%' OR 1=1 --_\\");
    const query = dialect.sqlToQuery(taskSearchFieldMatch(sql`title`, search));
    expect(query.sql).not.toContain("OR 1=1");
    expect(query.sql).not.toContain("проверка");
    expect(query.params).toContain("%проверка\\%'%");
    expect(query.params).toContain("%--\\_\\\\%");
  });

  it("retains Unicode preparation when normalization maps the input to ASCII", async () => {
    const { db, execute } = catalogDb();
    expect(() => taskSearchCtes("company-id", parseTaskSearch("K"))).toThrow("must be prepared");
    const search = await prepareTaskSearch(db, "K");
    expect(search.normalizedQuery).toBe("k");
    expect(execute).toHaveBeenCalledTimes(1);
    expect(dialect.sqlToQuery(taskSearchFieldMatch(sql`title`, search)).sql).toContain('"pg_catalog"."pg_unicode_fast"');
  });
});

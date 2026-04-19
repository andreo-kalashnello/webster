import { hash, verify } from "./hashing";

describe("hashing utils", () => {
  it("should hash a string", async () => {
    const hashed = await hash("password123");
    expect(hashed).toBeDefined();
    expect(hashed).not.toBe("password123");
    expect(hashed.startsWith("$argon2id$")).toBe(true);
  });

  it("should verify correct password", async () => {
    const hashed = await hash("secret");
    const result = await verify(hashed, "secret");
    expect(result).toBe(true);
  });

  it("should reject wrong password", async () => {
    const hashed = await hash("correct");
    const result = await verify(hashed, "wrong");
    expect(result).toBe(false);
  });
});

import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

const connection = new Connection(process.env.RPC_URL!, "confirmed");

function loadWallet(path: string): Keypair {
  const secretKeyString = fs.readFileSync(path, "utf8");
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  return Keypair.fromSecretKey(secretKey);
}

async function main() {
  const creator = loadWallet(process.env.CREATOR_WALLET!);
  console.log("🔐 Creator:", creator.publicKey.toBase58());

  // Mint SPL Token: 10B supply, 9 decimals
  const mint = await createMint(
    connection,
    creator,
    creator.publicKey,
    null,
    9
  );
  console.log("🪙 Token Mint Address:", mint.toBase58());

  // Create Vault ATA
  const vault = await getOrCreateAssociatedTokenAccount(
    connection,
    creator,
    mint,
    creator.publicKey
  );
  console.log("🏦 Vault Address:", vault.address.toBase58());

  // Mint 10B tokens
  const totalSupply = BigInt(10_000_000_000) * BigInt(10 ** 9);
  await mintTo(
    connection,
    creator,
    mint,
    vault.address,
    creator,
    Number(totalSupply)
  );
  console.log("✅ Minted 10B tokens");

  // Simulate DBC pool
  const dbcPoolId = Keypair.generate().publicKey.toBase58();
  console.log("📘 Simulated DBC Pool ID:", dbcPoolId);

  // Update .env
  const envPath = "./.env";
  const original = fs.readFileSync(envPath, "utf8");
  const updated = original
    .replace("DBC_POOL=TO_BE_FILLED_AFTER_POOL_CREATION", `DBC_POOL=${dbcPoolId}`)
    .replace("PROGRAM_ID=TO_BE_FILLED_AFTER_ANCHOR_DEPLOY", `PROGRAM_ID=YOUR_PROGRAM_ID_HERE`)
    .concat(`\nTOKEN_MINT=${mint.toBase58()}`);
  fs.writeFileSync(envPath, updated, "utf8");

  console.log("✅ Updated .env with DBC_POOL and TOKEN_MINT");
}

main().catch((err) => {
  console.error(" Error:", err);
});


import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  transfer,
} from "@solana/spl-token";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

function loadWallet(path: string): Keypair {
  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf8")));
  return Keypair.fromSecretKey(secretKey);
}

async function main() {
  const connection = new Connection(process.env.RPC_URL!, "confirmed");

  const creator = loadWallet(process.env.CREATOR_WALLET!);
  const buyer = loadWallet(process.env.BUYER_WALLET!);
  const mint = new PublicKey(process.env.TOKEN_MINT!);

  console.log("🔐 Creator:", creator.publicKey.toBase58());
  console.log("🧾 Buyer:", buyer.publicKey.toBase58());

  // 1. Check creator's SOL balance
  const balance = await connection.getBalance(creator.publicKey);
  const solBalance = balance / LAMPORTS_PER_SOL;
  console.log(`💰 Creator reserve: ${solBalance.toFixed(4)} SOL`);

  // 2. Check migration threshold
  const threshold = 85.85;
  if (solBalance < threshold) {
    console.log("ℹ️ Threshold not met. No migration triggered.");
    return;
  }

  console.log("🚀 Threshold met! Proceeding with migration...");

  // 3. Get Token Accounts (ATAs)
  const creatorATA = await getOrCreateAssociatedTokenAccount(
    connection,
    creator,
    mint,
    creator.publicKey
  );

  const buyerATA = await getOrCreateAssociatedTokenAccount(
    connection,
    buyer,
    mint,
    buyer.publicKey
  );

  const tokenAmount = creatorATA.amount;
  if (!tokenAmount || tokenAmount === BigInt(0)) {
    console.error("❌ No tokens in creator's vault to migrate.");
    return;
  }

  console.log(`📦 Transferring ${Number(tokenAmount) / 1e9} tokens to Buyer...`);

  // 4. Transfer SPL tokens from creator to buyer
  await transfer(
    connection,
    creator,
    creatorATA.address,
    buyerATA.address,
    creator.publicKey,
    Number(tokenAmount)
  );

  console.log("✅ Token migration complete!");

  // 5. Simulate DAMM V2 Pool creation
  const dammPoolId = "DAMM_" + Math.random().toString(36).substring(2, 10).toUpperCase();

  // 6. Update `.env` with migration info
  const envPath = "./.env";
  const env = fs.readFileSync(envPath, "utf8");
  const updatedEnv = env
    .replace(/MIGRATED=.*\n?/g, "") // remove if exists
    .replace(/DAMM_POOL=.*\n?/g, "") // remove if exists
    .concat(`\nMIGRATED=true\nDAMM_POOL=${dammPoolId}\n`);
  fs.writeFileSync(envPath, updatedEnv, "utf8");

  console.log(`📁 MIGRATED=true and DAMM_POOL=${dammPoolId} written to .env`);
  console.log("🎉 Full migration between users complete!");
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
});

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  transfer,
} from "@solana/spl-token";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

const connection = new Connection(process.env.RPC_URL!, "confirmed");

function loadWallet(path: string): Keypair {
  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf8")));
  return Keypair.fromSecretKey(secretKey);
}

async function main() {
  const buyer = loadWallet(process.env.BUYER_WALLET!);
  const creator = loadWallet(process.env.CREATOR_WALLET!);

  const mint = new PublicKey(process.env.TOKEN_MINT!);

  // Buyer ATA (create if not exists)
  const buyerATA = await getOrCreateAssociatedTokenAccount(
    connection,
    buyer,
    mint,
    buyer.publicKey
  );

  // Creator vault (token source)
  const creatorVault = await getOrCreateAssociatedTokenAccount(
    connection,
    creator,
    mint,
    creator.publicKey
  );

  // Simulate price per token (e.g., 0.01 SOL)
  const lamports = 0.01 * 1e9; // adjust per DBC logic
  const numTokens = 100 * 10 ** 9;

  // Pay SOL to creator (simulate buy)
  const transferSol = SystemProgram.transfer({
    fromPubkey: buyer.publicKey,
    toPubkey: creator.publicKey,
    lamports: lamports,
  });

  // Transfer tokens from vault to buyer
  const transferTokens = await transfer(
    connection,
    creator,
    creatorVault.address,
    buyerATA.address,
    creator.publicKey,
    Number(numTokens)
  );

  const tx = new Transaction().add(transferSol);
  const sig = await sendAndConfirmTransaction(connection, tx, [buyer]);
  console.log("✅ Buy transaction completed:", sig);
}

main().catch(console.error);



import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
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

  const buyerATA = await getOrCreateAssociatedTokenAccount(
    connection,
    buyer,
    mint,
    buyer.publicKey
  );

  const creatorVault = await getOrCreateAssociatedTokenAccount(
    connection,
    creator,
    mint,
    creator.publicKey
  );

  const numTokens = 100 * 10 ** 9;

  // Transfer tokens from buyer to vault
  const transferTokens = await transfer(
    connection,
    buyer,
    buyerATA.address,
    creatorVault.address,
    buyer.publicKey,
    Number(numTokens)
  );

  // Send SOL refund (simulate token sell)
  const lamports = 0.008 * 1e9; // DBC calculated refund
  const refundTx = SystemProgram.transfer({
    fromPubkey: creator.publicKey,
    toPubkey: buyer.publicKey,
    lamports: lamports,
  });

  const tx = new Transaction().add(refundTx);
  const sig = await sendAndConfirmTransaction(connection, tx, [creator]);
  console.log("✅ Sell transaction completed:", sig);
}

main().catch(console.error);

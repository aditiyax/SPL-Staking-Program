import {join} from "path";
import {readFileSync} from "fs";
import * as anchor from "@coral-xyz/anchor";
import { BN, Program}  from "@coral-xyz/anchor";
import * as web3 from "@solana/web3.js";
import {TOKEN_PROGRAM_ID, Token} from "@solana/spl-token";  
import {assert} from "chai";
import { StakingToken } from "../target/types/staking_token";

describe("Test", () => {
  // Configure the client to use the local cluster
 const provider = anchor.AnchorProvider.env();
 anchor.setProvider(provider);

  const program = anchor.workspace
  .StakingToken as anchor.Program<StakingToken>;

  const WALLET_PATH = join(process.env["HOME"]!, "./config/solana/id.json");
  const admin = web3.Keypair.fromSecretKey(
    Buffer.from(JSON.parse(readFileSync(WALLET_PATH, {encoding: "utf-8"})))
  );

  const user = web3.Keypair.generate();
  const poolInfo = web3.Keypair.generate();
  const userInfo = web3.Keypair.generate();
  
  let token: Token;
  let adminTokenAccount: web3.PublicKey;
  let userTokenAccount: web3.PublicKey;

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        admin.publicKey,
        10* web3.LAMPORTS_PER_SOL
      ),
      "confirmed"
    );

    token = await Token.createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      9, 
      TOKEN_PROGRAM_ID,
    );

    adminTokenAccount = await token.createAccount(admin.publicKey);
    userTokenAccount = await token.createAccount(user.publicKey);

    await token.mintTo (userTokenAccount, admin.publicKey, [admin], 1e10);
  });

  it("initialize", async () => {
    // // Generate keypair for the new account
    let _adminTokenAccount = await token.getAccountInfo(adminTokenAccount);
    assert.strictEqual(_adminTokenAccount.amount.toNumber(),0);
    
    const tx = await program.methods
    .initialize(new BN(1), new BN(1e10))
    .accounts({
      admin: admin.publicKey,
      poolInfo: poolInfo.publicKey,
      stakingToken : token.publicKey,
      adminStakingWallet: adminTokenAccount,
      systemProgram: web3.SystemProgram.programId,
    })
    .signers([admin, poolInfo])
    .rpc();
    console.log("Your Transaction signature", tx);

    it("Stake", async () => {
      let _userTokenAccount = await token.getAccountInfo(userTokenAccount);
      assert.strictEqual(_userTokenAccount.amount.toNumber(), 1e10);

      const tx = await program.methods
      .stake(new BN(1e10))
      .accounts({
        user: user.publicKey,
        admin: admin.publicKey,
        userInfo: userInfo.publicKey,
        userStakingWallet: userTokenAccount,
        adminStakingWallet: adminTokenAccount,
        stakingToken :token.publicKey,
        tokenProgram : TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([user, userInfo])
      .rpc();
      console.log("Yout transaction signature", tx);

      let _adminTokenAccount = await token.getAccountInfo(adminTokenAccount);
      assert.strictEqual(_adminTokenAccount.amount.toNumber(), 1e10);
    });

    it("Claim Reward", async() => {
      let _adminTokenAccount = await token.getAccountInfo(adminTokenAccount);
      assert.strictEqual(_adminTokenAccount.amount.toNumber(), 1e10);

      const tx = await program.methods
      .claimReward()
      .accounts({
        user: user.publicKey,
        admin: admin.publicKey,
        userInfo: userInfo.publicKey,
        userStakingWallet: userTokenAccount,
        adminStakingWallet : adminTokenAccount,
        stakingToken: token.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
      console.log("Your transaction signature", tx);

      let _userTokenAccount = await token.getAccountInfo(adminTokenAccount);
      assert.strictEqual(_userTokenAccount.amount.toNumber(),1);
    });

    it("Unstake", async() => {
      let _adminTokenAccount = await token.getAccountInfo(adminTokenAccount);
      assert.strictEqual(_adminTokenAccount.amount.toNumber(), 1e10);

      const tx = await program.methods
      .unstake()
      .accounts({
        user: user.publicKey,
        admin: admin.publicKey,
        userInfo: userInfo.publicKey,
        userStakingWallet: userTokenAccount,
        adminStakingWallet: adminTokenAccount,
        stakingToken: token.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

      console.log("Your transaction signature", tx);

      let _userTokenAccount = await token.getAccountInfo(userTokenAccount);
      assert.strictEqual(_userTokenAccount.amount.toNumber(), 1e10 +2);
    });
    // Send transaction
  });
}); 
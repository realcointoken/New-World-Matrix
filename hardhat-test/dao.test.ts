import { ethers } from "hardhat";
import { Multisig, Multisig__factory, NewWETH, NewWETH__factory, UniswapDAO, UniswapDAO__factory, UniswapV2Factory, UniswapV2Factory__factory, UniswapV2Router02, UniswapV2Router02__factory } from "../typechain-types";
import {expect} from "chai";
import { BigNumber, utils } from 'ethers';
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("\x1b[33mMultisig test\x1b[0m\n", () => {
    const beforeTest = "\t";
    const insideTest = "\t\t";
    const colorRed = "\x1b[31m";
    const colorGreen = "\x1b[32m";
    const colorBlue = "\x1b[36m";
    const colorReset = "\x1b[0m";

    const zeroAddress = "0x0000000000000000000000000000000000000000";
    let provider: any;
    let accounts: SignerWithAddress[];

    let owner: SignerWithAddress;
    let voterFirst: SignerWithAddress;
    let voterSecond: SignerWithAddress;
    let newVoterFirst: SignerWithAddress;
    let newVoterSecond: SignerWithAddress;

    let multisig: Multisig;

    before(async () => {
        provider = ethers.provider;
        accounts = await ethers.getSigners();
        [ owner, voterFirst, voterSecond, newVoterFirst, newVoterSecond ] = await ethers.getSigners();

        multisig = await (await new Multisig__factory(owner).deploy()).deployed();
        console.log(`${beforeTest}Deployed multisig contract: ${colorBlue}${multisig.address}${colorReset}`);
    });

    it("Insert initial voter", async () => {
        const res = await multisig.getActiveVotersCount();
        console.log(`${insideTest}Compares active voters count [${colorBlue}${res}${colorReset}] with returned value: [${colorGreen}${1}${colorReset}]`);
        expect(res).equals(1);
    });

    it("Insert voter to voter list if not zero address and not already a voter", async () => {
        console.log(`${insideTest}Creates new voter including request`);
        await multisig.connect(owner).newVoterRequest(true, newVoterFirst.address);
        console.log(`${insideTest}Creates new voter including request`);
        await multisig.connect(owner).newVoterRequest(true, newVoterSecond.address);

        const res1 = await multisig.getVoterStatusByAddress(newVoterFirst.address);
        const res2 = await multisig.getVoterStatusByAddress(newVoterSecond.address);

        console.log(`${insideTest}Compares address isVoter status [${colorBlue}${res1}${colorReset}] with returned value: [${colorGreen}${false}${colorReset}]`);
        console.log(`${insideTest}Compares address isVoter status [${colorBlue}${res2}${colorReset}] with returned value: [${colorGreen}${false}${colorReset}]`);
        expect(res1).equals(false);
        expect(res2).equals(false);
    });

    it('Insert voters if enough votes', async () => {    
        console.log(`${insideTest}Inserts new voter`);    
        await multisig.connect(owner).votersRequestConclusion(1);
       
        console.log(`${insideTest}Confirms including new voter`);
        await multisig.connect(newVoterFirst).newVoteForVoterRequest(true, 2)
        console.log(`${insideTest}Inserts new voter`);
        await multisig.connect(owner).votersRequestConclusion(2);

        console.log(`${insideTest}Creates new voter including request`);
        await multisig.connect(owner).newVoterRequest(true, voterSecond.address);
        // console.log(`${insideTest}Confirms including new voter`);
        // await multisig.connect(newVoterFirst).newVoteForVoterRequest(false, 3)
        
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if vote request is not active, while inserting vote`);
        await expect(multisig.connect(newVoterFirst).newVoteForVoterRequest(true, 1)).revertedWith('not active');
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if vote request is not active, while executing voter request result`);
        await expect(multisig.connect(owner).votersRequestConclusion(2)).revertedWith('not active');
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if not enough votes`);
        await expect(multisig.connect(owner).votersRequestConclusion(3)).revertedWith('not enough votes');
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if new voter is already a voter`);
        await expect(multisig.connect(owner).newVoterRequest(true, newVoterFirst.address)).revertedWith('already a voter');
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if new voter address is zero address)`);
        await expect(multisig.connect(owner).newVoterRequest(true, zeroAddress)).revertedWith('zero address');
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if sender is not a voter`);
        await expect(multisig.connect(voterFirst).newVoterRequest(true, newVoterFirst.address)).revertedWith('not a voter');
        
        const res = await multisig.getActiveVotersCount();
        console.log(`${insideTest}Compares active voters count [${colorBlue}${res}${colorReset}] with returned value: [${colorGreen}${3}${colorReset}]`);
        expect(res).equals(3);
    });

    it('Remove voter if enough votes', async () => {     
        console.log(`${insideTest}Creates new voter removing request`);           
        await multisig.connect(owner).newVoterRequest(false, newVoterFirst.address);
        await multisig.connect(newVoterSecond).newVoteForVoterRequest(true, 4);
        await multisig.connect(newVoterSecond).newVoteForVoterRequest(false, 4);
        await multisig.connect(newVoterSecond).newVoteForVoterRequest(true, 4);

        console.log(`${insideTest}Removes voter`);
        await multisig.connect(owner).votersRequestConclusion(4);

        await multisig.connect(newVoterSecond).newVoterRequest(true, voterSecond.address);
        
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if vote request is not active, while removing vote`);
        await expect(multisig.connect(newVoterSecond).newVoteForVoterRequest(false, 1)).revertedWith('not active');
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if vote request is not active, while executing voter request result`);
        await expect(multisig.connect(owner).votersRequestConclusion(4)).revertedWith('not active');
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if not enough votes`);
        await expect(multisig.connect(owner).votersRequestConclusion(5)).revertedWith('not enough votes');
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if new voter address is not a voter, while removing`);
        await expect(multisig.connect(owner).newVoterRequest(false, newVoterFirst.address)).revertedWith('not a voter');
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if sender(removed voter) is not a voter`);
        await expect(multisig.connect(newVoterFirst).newVoterRequest(false, newVoterFirst.address)).revertedWith('not a voter');
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if new voter address is ero address)`);
        await expect(multisig.connect(owner).newVoterRequest(false, zeroAddress)).revertedWith('zero address');
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if sender is not a voter`);
        await expect(multisig.connect(voterFirst).newVoterRequest(false, newVoterFirst.address)).revertedWith('not a voter');

        const res = await multisig.getActiveVotersCount();
        console.log(`${insideTest}Compares active voters count [${colorBlue}${res}${colorReset}] with returned value: [${colorGreen}${2}${colorReset}]`);
        expect(res).equals(2);
    });

})

describe("\x1b[33mDAO test\x1b[0m\n", () => {
    const beforeTest = "\t";
    const insideTest = "\t\t";
    const colorRed = "\x1b[31m";
    const colorGreen = "\x1b[32m";
    const colorBlue = "\x1b[36m";
    const colorReset = "\x1b[0m";

    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const someAddress = "0xcafecafecafecafecafecafecafecafecafecafe";
    let provider: any;
    let accounts: SignerWithAddress[];

    let owner: SignerWithAddress;
    let treasuryAccount: SignerWithAddress;
    let someAccount: SignerWithAddress;

    let dao: UniswapDAO;
    let weth: NewWETH;
    let factory: UniswapV2Factory;
    let router: UniswapV2Router02;

    before(async () => {
        provider = ethers.provider;
    
        accounts = await ethers.getSigners();

        [ owner, treasuryAccount, someAccount ] = await ethers.getSigners();

        factory = await (await new UniswapV2Factory__factory(owner).deploy(owner.address, treasuryAccount.address)).deployed();

        weth = await (await new NewWETH__factory(owner).deploy()).deployed();

        router = await (await new UniswapV2Router02__factory(owner).deploy(factory.address, weth.address)).deployed();

        dao = await (await new UniswapDAO__factory(owner).deploy(factory.address)).deployed();
    });

    it("Set DAO initial\n", async () => {
        await expect(factory.connect(treasuryAccount).setDAOContractInitial(dao.address)).revertedWith("not daoSetter"); 
        await expect(factory.connect(owner).setDAOContractInitial(someAccount.address)).revertedWith("EOA");
        await expect(factory.connect(owner).setDAOContractInitial(zeroAddress)).revertedWith("zero address"); 
       
        console.log(`${insideTest}Creates new dao change request`);
        await factory.connect(owner).setDAOContractInitial(dao.address);

        console.log(`${insideTest}${colorRed}Reverts${colorReset} if dao initial is already set`);
        await expect(factory.connect(owner).setDAOContractInitial(dao.address)).revertedWith("already set"); 

        const address = await factory.connect(owner).daoAddress();
        console.log(`${insideTest}Compares new dao address [${colorBlue}${dao.address}${colorReset}] with returned value: [${colorGreen}${address}${colorReset}]`);
        expect(dao.address).equals(address);
    });

    it("FeeTo change request is available and returns correct address\n", async () => {
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if sender is not a voter`);
        await expect(dao.connect(treasuryAccount).newFeeToChangeRequest(someAccount.address)).revertedWith("not a voter"); 
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if new feeTo is zero address`);
        await expect(dao.connect(owner).newFeeToChangeRequest(zeroAddress)).revertedWith("zero address"); 
       
        console.log(`${insideTest}Creates new feeTo change request`);
        await dao.connect(owner).newFeeToChangeRequest(someAccount.address);

        console.log(`${insideTest}${colorRed}Reverts${colorReset} if vote is already confirmed(true)`);
        await expect(dao.connect(owner).newVoteForFeeToChangeRequest(true, await dao.getFeeToChangeRequestCount())).revertedWith("already confirmed");
        
        await dao.connect(owner).newVoteForFeeToChangeRequest(false, await dao.getFeeToChangeRequestCount()); 
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if not enough votes`);
        await expect(dao.connect(owner).isFeeToChangeAvailable(await dao.getFeeToChangeRequestCount())).revertedWith("not enough votes");
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if vote is already removed(false)`);
        await expect(dao.connect(owner).newVoteForFeeToChangeRequest(false, await dao.getFeeToChangeRequestCount())).revertedWith("not confirmed");
        await dao.connect(owner).newVoteForFeeToChangeRequest(true, await dao.getFeeToChangeRequestCount());

        const address = await dao.connect(owner).isFeeToChangeAvailable(await dao.getFeeToChangeRequestCount());
        await factory.connect(owner).setFeeTo(await dao.getFeeToChangeRequestCount());
        console.log(`${insideTest}Compares feeTo address [${colorBlue}${someAccount.address}${colorReset}] with returned value: [${colorGreen}${address}${colorReset}]`);
        expect(someAccount.address).equals(address);

        console.log(`${insideTest}Creates new feeTo change request`);
        await dao.connect(owner).newFeeToChangeRequest(someAccount.address);
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if new feeTo address equals to old feeTo address`);
        await expect(factory.connect(treasuryAccount).setFeeTo(await dao.getFeeToChangeRequestCount())).revertedWith("same address");
    });

    it("Treasury change request is available and returns correct address\n", async () => {
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if sender is not a voter`);
        await expect(dao.connect(treasuryAccount).newTreasuryChangeRequest(someAccount.address)).revertedWith("not a voter"); 
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if new owner is zero address`);
        await expect(dao.connect(owner).newTreasuryChangeRequest(zeroAddress)).revertedWith("zero address"); 
       
        console.log(`${insideTest}Creates new treasury change request`);
        await dao.connect(owner).newTreasuryChangeRequest(someAccount.address);

        console.log(`${insideTest}${colorRed}Reverts${colorReset} if vote is already confirmed(true)`);
        await expect(dao.connect(owner).newVoteForTreasuryChangeRequest(true, await dao.getTreasuryChangeRequestCount())).revertedWith("already confirmed");
        
        await dao.connect(owner).newVoteForTreasuryChangeRequest(false, await dao.getTreasuryChangeRequestCount()); 
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if not enough votes`);
        await expect(dao.connect(owner).isTreasuryChangeAvailable(await dao.getTreasuryChangeRequestCount())).revertedWith("not enough votes");
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if vote is already removed(false)`);
        await expect(dao.connect(owner).newVoteForTreasuryChangeRequest(false, await dao.getTreasuryChangeRequestCount())).revertedWith("not confirmed");
        await dao.connect(owner).newVoteForTreasuryChangeRequest(true, await dao.getTreasuryChangeRequestCount());

        const address = await dao.connect(owner).isTreasuryChangeAvailable(await dao.getTreasuryChangeRequestCount());
        console.log(`${insideTest}Compares treasury address [${colorBlue}${someAccount.address}${colorReset}] with returned value: [${colorGreen}${address}${colorReset}]`);
        expect(someAccount.address).equals(address);
        await factory.connect(owner).setTreasuryAddress(await dao.getTreasuryChangeRequestCount());

        console.log(`${insideTest}Creates new treasury change request`);
        await dao.connect(owner).newTreasuryChangeRequest(someAccount.address);
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if new treasury address equals to old feeTo address`);
        await expect(factory.connect(owner).setTreasuryAddress(await dao.getTreasuryChangeRequestCount())).revertedWith("same address");
    });

    it("Router change request is available and returns correct address\n", async () => {
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if sender is not a voter`);
        await expect(dao.connect(treasuryAccount).newRouterChangeRequest(router.address)).revertedWith("not a voter"); 
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if new owner is zero address`);
        await expect(dao.connect(owner).newRouterChangeRequest(zeroAddress)).revertedWith("zero address"); 
       
        console.log(`${insideTest}Creates new router change request`);
        await dao.connect(owner).newRouterChangeRequest(router.address);

        console.log(`${insideTest}${colorRed}Reverts${colorReset} if vote is already confirmed(true)`);
        await expect(dao.connect(owner).newVoteForRouterChangeRequest(true, await dao.getRouterChangeRequestCount())).revertedWith("already confirmed");
        
        await dao.connect(owner).newVoteForRouterChangeRequest(false, await dao.getRouterChangeRequestCount()); 
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if not enough votes`);
        await expect(dao.connect(owner).isRouterChangeAvailable(await dao.getRouterChangeRequestCount())).revertedWith("not enough votes");
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if vote is already removed(false)`);
        await expect(dao.connect(owner).newVoteForRouterChangeRequest(false, await dao.getRouterChangeRequestCount())).revertedWith("not confirmed");
        await dao.connect(owner).newVoteForRouterChangeRequest(true, await dao.getRouterChangeRequestCount());

        const address = await dao.connect(owner).isRouterChangeAvailable(await dao.getRouterChangeRequestCount());
        await factory.connect(owner).setRouterAddress(await dao.getRouterChangeRequestCount());
        console.log(`${insideTest}Compares router address [${colorBlue}${router.address}${colorReset}] with returned value: [${colorGreen}${address}${colorReset}]`);
        expect(router.address).equals(address);

        console.log(`${insideTest}Creates new router change request`);
        await dao.connect(owner).newRouterChangeRequest(router.address);
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if new router address equals to old feeTo address`);
        await expect(factory.connect(owner).setRouterAddress(await dao.getRouterChangeRequestCount())).revertedWith("same address");
    });

    it("DAO change request is available and returns correct address\n", async () => {
        const newDao = await (await new UniswapDAO__factory(owner).deploy(factory.address)).deployed();

        console.log(`${insideTest}${colorRed}Reverts${colorReset} if sender is not a voter`);
        await expect(dao.connect(treasuryAccount).newDAOAddressChangeRequest(newDao.address)).revertedWith("not a voter"); 
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if address is EOA`);
        await expect(dao.connect(owner).newDAOAddressChangeRequest(someAccount.address)).revertedWith("EOA");
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if new dao is zero address`);
        await expect(dao.connect(owner).newDAOAddressChangeRequest(zeroAddress)).revertedWith("zero address"); 
       
        console.log(`${insideTest}Creates new dao change request`);
        await dao.connect(owner).newDAOAddressChangeRequest(newDao.address);

        console.log(`${insideTest}${colorRed}Reverts${colorReset} if vote is already confirmed(true)`);
        await expect(dao.connect(owner).newVoteForDAOChangeRequest(true, await dao.getDAOChangeRequestCount())).revertedWith("already confirmed");
        
        await dao.connect(owner).newVoteForDAOChangeRequest(false, await dao.getDAOChangeRequestCount()); 
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if not enough votes`);
        await expect(dao.connect(owner).isDAOChangeAvailable(await dao.getDAOChangeRequestCount())).revertedWith("not enough votes");
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if vote is already removed(false)`);
        await expect(dao.connect(owner).newVoteForDAOChangeRequest(false, await dao.getDAOChangeRequestCount())).revertedWith("not confirmed");
        await dao.connect(owner).newVoteForDAOChangeRequest(true, await dao.getDAOChangeRequestCount());

        const address = await dao.connect(owner).isDAOChangeAvailable(await dao.getDAOChangeRequestCount());
        console.log(`${insideTest}Compares new dao address [${colorBlue}${newDao.address}${colorReset}] with returned value: [${colorGreen}${address}${colorReset}]`);
        expect(newDao.address).equals(address);

        console.log(`${insideTest}Creates new dao change request`);
        await dao.connect(owner).newDAOAddressChangeRequest(dao.address);
        console.log(`${insideTest}${colorRed}Reverts${colorReset} if new dao address equals to old dao address`);
        await expect(factory.connect(owner).setDao(await dao.getDAOChangeRequestCount())).revertedWith("same address");
    });
    
})
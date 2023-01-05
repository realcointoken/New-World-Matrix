import {ethers} from "hardhat";
import { UniswapV2Router02, UniswapV2Factory, UniswapV2Factory__factory, UniswapV2Router02__factory, ERC20test, ERC20test__factory, WETH, WETH__factory, NewWETH, NewWETH__factory, UniswapDAO, UniswapDAO__factory } from "../typechain-types";
import {expect} from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("\x1b[33mUniswap test\x1b[0m\n", () => {
    const beforeTest = "\t";
    const colorGreen = "\x1b[32m";
    const colorBlue = "\x1b[36m";
    const colorReset = "\x1b[0m";

    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const someAddress = "0xcafecafecafecafecafecafecafecafecafecafe";
    let provider: any;

    let owner: SignerWithAddress;
    let treasuryAccount: SignerWithAddress;

    let factory: UniswapV2Factory;
    let dao: UniswapDAO;
    let router: UniswapV2Router02;
    let weth: NewWETH;
    let token1: ERC20test;
    let token2: ERC20test;

    beforeEach(async () => {
        provider = ethers.provider;

        [ owner, treasuryAccount ] = await ethers.getSigners();

        const treasuryAddress = treasuryAccount.address;

        factory = await (await new UniswapV2Factory__factory(owner).deploy(owner.address, treasuryAddress)).deployed();

        dao = await (await new UniswapDAO__factory(owner).deploy(factory.address)).deployed();

        await expect(factory.connect(treasuryAccount).setDAOContractInitial(dao.address)).revertedWith("not daoSetter");
        await expect(factory.connect(owner).setDAOContractInitial(zeroAddress)).revertedWith("zero address");
        await expect(factory.connect(owner).setDAOContractInitial(owner.address)).revertedWith("EOA");
        await factory.connect(owner).setDAOContractInitial(dao.address);

        weth = await (await new NewWETH__factory(owner).deploy()).deployed();

        router = await (await new UniswapV2Router02__factory(owner).deploy(factory.address, weth.address)).deployed();
        
        await dao.connect(owner).newRouterChangeRequest(router.address);
        await factory.connect(owner).setRouterAddress(1);

        await dao.connect(owner).newFeeToChangeRequest(treasuryAddress);
        await factory.connect(owner).setFeeTo(1);

        const totalSupply = ethers.utils.parseUnits("1000000000000", 18);
        token1 = await (await new ERC20test__factory(owner).deploy(totalSupply, "MyToken1", "MYT1")).deployed();
        token2 = await (await new ERC20test__factory(owner).deploy(totalSupply, "MyToken2", "MYT2")).deployed();
    });

    it("Dao contract address is already set", async () => {
        await expect(factory.connect(owner).setDAOContractInitial(dao.address)).revertedWith("already set");
    });

    it("Router contract address is zero address", async () => {
        await dao.connect(owner).newRouterChangeRequest(router.address);
        await expect(factory.connect(owner).setRouterAddress(2)).revertedWith("same address");
    });

    it("Add liq if liq does not exist", async () => {       
        const amountADesired = ethers.utils.parseUnits("25", 18);
        const amountBDesired = ethers.utils.parseUnits("25", 18);
        
        const amountAMin = ethers.utils.parseUnits("20", 18);
        const amountBMin = ethers.utils.parseUnits("20", 18);

        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);

        await router.connect(owner).addLiquidity(token1.address, token2.address, amountADesired, amountBDesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000 });
    });

    it("Add liq if liq exists and then remove it", async () => {       
        const amountADesired = ethers.utils.parseUnits("25", 18);
        const amountBDesired = ethers.utils.parseUnits("25", 18);
        
        const amountAMin = ethers.utils.parseUnits("20", 18);
        const amountBMin = ethers.utils.parseUnits("20", 18);

        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);

        await router.connect(owner).addLiquidity(token1.address, token2.address, amountADesired, amountBDesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000 });
        
        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);

        await router.connect(owner).addLiquidity(token1.address, token2.address, amountADesired, amountBDesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000 });    
    
        const pairAddress = await factory.connect(owner).getPair(token1.address, token2.address);
        const pair = await ethers.getContractAt("UniswapV2Pair", pairAddress, owner);
        const pairBalance = await pair.balanceOf(owner.address);

        await pair.connect(owner).approve(router.address, pairBalance)

        await router.connect(owner).removeLiquidity(token1.address, token2.address, pairBalance, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000 });    
    });

    it("Add payable liq", async () => {       
        const amountADesired = ethers.utils.parseUnits("25", 18);
        const etherAmount = ethers.utils.parseEther("20.0");
        
        const amountAMin = ethers.utils.parseUnits("20", 18);
        const amountBMin = ethers.utils.parseUnits("20", 18);

        await token1.connect(owner).approve(router.address, amountADesired);

        await router.connect(owner).addLiquidityETH(token1.address, amountADesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000, value: etherAmount });
    });

    it("Add payable liq if liq exists and then remove it", async () => {       
        const amountADesired = ethers.utils.parseUnits("25", 18);
        const etherAmount = ethers.utils.parseEther("20.0");
        
        const amountAMin = ethers.utils.parseUnits("20", 18);
        const amountBMin = ethers.utils.parseUnits("20", 18);

        await token1.connect(owner).approve(router.address, amountADesired);

        await router.connect(owner).addLiquidityETH(token1.address, amountADesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000, value: etherAmount });
    
        await token1.connect(owner).approve(router.address, amountADesired);

        await router.connect(owner).addLiquidityETH(token1.address, amountADesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000, value: etherAmount });

        const pairAddress = await factory.connect(owner).getPair(token1.address, weth.address);
        const pair = await ethers.getContractAt("UniswapV2Pair", pairAddress, owner);
        const pairBalance = await pair.balanceOf(owner.address);

        await pair.connect(owner).approve(router.address, pairBalance)

        await router.connect(owner).removeLiquidityETH(token1.address, pairBalance, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000 });    
    });

    it("swapExactETHForTokens in wETH pair", async () => {    
        const amountADesired = ethers.utils.parseUnits("25", 18);
        const etherAmount = ethers.utils.parseEther("20.0");
        
        const amountAMin = ethers.utils.parseUnits("20", 18);
        const amountBMin = ethers.utils.parseUnits("20", 18);

        await token1.connect(owner).approve(router.address, amountADesired);

        await router.connect(owner).addLiquidityETH(token1.address, amountADesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000, value: etherAmount });

        await token1.connect(owner).approve(router.address, amountADesired);

        const etherSwapAmount = ethers.utils.parseUnits("10", 18);
        await router.connect(owner).swapExactETHForTokens(ethers.utils.parseUnits("1", 18), [weth.address, token1.address], owner.address, Date.now() + 20, { gasLimit: 3045000, value: etherSwapAmount  });    
    
        const balanceTreasuryAfterWETH = await weth.balanceOf(treasuryAccount.address);
        const balanceTreasuryAfterToken1 = await token1.balanceOf(treasuryAccount.address);
        expect(balanceTreasuryAfterWETH).equals(ethers.utils.parseUnits("10", 15));
        expect(balanceTreasuryAfterToken1).equals("0");
    });

    it("swapETHForExactTokens in wETH pair", async () => {
        const amountADesired = ethers.utils.parseUnits("25", 18);
        const etherAmount = ethers.utils.parseEther("20.0");
        
        const amountAMin = ethers.utils.parseUnits("20", 18);
        const amountBMin = ethers.utils.parseUnits("20", 18);

        await token1.connect(owner).approve(router.address, amountADesired);

        await router.connect(owner).addLiquidityETH(token1.address, amountADesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000, value: etherAmount });

        await token1.connect(owner).approve(router.address, amountADesired);

        const desiredAmount = ethers.utils.parseUnits("9", 18)
        await router.connect(owner).swapETHForExactTokens(desiredAmount, [weth.address, token1.address], owner.address, Date.now() + 20, { gasLimit: 3045000, value: ethers.utils.parseUnits("14", 18) });    
    
        const balanceTreasuryAfterWeth = await weth.balanceOf(treasuryAccount.address);
        const balanceTreasuryAfterToken1 = await token1.balanceOf(treasuryAccount.address);
        expect(balanceTreasuryAfterWeth).equals(ethers.utils.parseUnits("11.283851554663991", 15));
        expect(balanceTreasuryAfterToken1).equals("0");
    });

    it("swapExactTokensForETH in wETH pair", async () => {    
        const amountADesired = ethers.utils.parseUnits("25", 18);
        const etherAmount = ethers.utils.parseEther("20.0");
        
        const amountAMin = ethers.utils.parseUnits("20", 18);
        const amountBMin = ethers.utils.parseUnits("20", 18);

        await token1.connect(owner).approve(router.address, amountADesired);

        await router.connect(owner).addLiquidityETH(token1.address, amountADesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000, value: etherAmount });

        await token1.connect(owner).approve(router.address, amountADesired);

        await router.connect(owner).swapExactTokensForETH(amountAMin, 1, [token1.address, weth.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });    
    
        const balanceTreasuryAfterWeth = await weth.balanceOf(treasuryAccount.address);
        const balanceTreasuryAfterToken1 = await token1.balanceOf(treasuryAccount.address);
        expect(balanceTreasuryAfterToken1).equals(ethers.utils.parseUnits("20", 15));
        expect(balanceTreasuryAfterWeth).equals("0");
    });

    it("swapExactTokensForTokens if wETH pairs do not exist", async () => {    
        const amountADesired = ethers.utils.parseUnits("25", 18);
        const amountBDesired = ethers.utils.parseUnits("25", 18);
        
        const amountAMin = ethers.utils.parseUnits("20", 18);
        const amountBMin = ethers.utils.parseUnits("20", 18);

        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);

        await router.connect(owner).addLiquidity(token1.address, token2.address, amountADesired, amountBDesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000 });
        
        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);
 
        await router.connect(owner).swapExactTokensForTokens(amountAMin, 1, [token1.address, token2.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });    
    
        const balanceTreasuryAfterToken1 = await token1.balanceOf(treasuryAccount.address);
        const balanceTreasuryAfterToken2 = await token2.balanceOf(treasuryAccount.address);
        
        expect(balanceTreasuryAfterToken1).equals(ethers.utils.parseUnits("20", 15));
        expect(balanceTreasuryAfterToken2).equals("0");
    });

    it("swapExactTokensForTokens if wETH pair exist for first token", async () => {    
        const amountADesired = ethers.utils.parseUnits("25", 18);
        const amountBDesired = ethers.utils.parseUnits("25", 18);
        
        const amountAMin = ethers.utils.parseUnits("20", 18);
        const amountBMin = ethers.utils.parseUnits("20", 18);

        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);
        await router.connect(owner).addLiquidity(token1.address, token2.address, amountADesired, amountBDesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000 });
        
        const etherAmount = ethers.utils.parseEther("20.0");

        await token1.connect(owner).approve(router.address, amountADesired);
        await router.connect(owner).addLiquidityETH(token1.address, amountADesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000, value: etherAmount });

        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);
        await router.connect(owner).swapExactTokensForTokens(amountAMin, 1, [token1.address, token2.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });    
    
        const balanceTreasuryAfterToken1 = await token1.balanceOf(treasuryAccount.address);
        const balanceTreasuryAfterToken2 = await token2.balanceOf(treasuryAccount.address);
    
        expect(balanceTreasuryAfterToken1).equals(ethers.utils.parseUnits("20", 15));
        expect(balanceTreasuryAfterToken2).equals("0");
    });

    it("swapExactTokensForTokens if wETH pair exist for second token", async () => {    
        const amountADesired = ethers.utils.parseUnits("25", 18);
        const amountBDesired = ethers.utils.parseUnits("25", 18);
        
        const amountAMin = ethers.utils.parseUnits("20", 18);
        const amountBMin = ethers.utils.parseUnits("20", 18);

        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);
        await router.connect(owner).addLiquidity(token1.address, token2.address, amountADesired, amountBDesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000 });
        
        const etherAmount = ethers.utils.parseEther("20.0");

        await token2.connect(owner).approve(router.address, amountADesired);
        await router.connect(owner).addLiquidityETH(token2.address, amountADesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000, value: etherAmount });

        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);
        await router.connect(owner).swapExactTokensForTokens(amountAMin, 1, [token1.address, token2.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });    
    
        const balanceTreasuryAfterToken1 = await token1.balanceOf(treasuryAccount.address);
        const balanceTreasuryAfterToken2 = await token2.balanceOf(treasuryAccount.address);
    
        expect(balanceTreasuryAfterToken1).equals(ethers.utils.parseUnits("20", 15));
        expect(balanceTreasuryAfterToken2).equals("0");
    });

    it("swapExactTokensForTokens if wETH pairs exist", async () => {    
        const amountADesired = ethers.utils.parseUnits("20", 18);
        const amountBDesired = ethers.utils.parseUnits("20", 18);
        
        const amountAMin = ethers.utils.parseUnits("20", 18);
        const amountBMin = ethers.utils.parseUnits("20", 18);

        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);
        await router.connect(owner).addLiquidity(token1.address, token2.address, amountADesired, amountBDesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000 });
        
        const etherAmount = ethers.utils.parseEther("20.0");

        await token1.connect(owner).approve(router.address, amountADesired);
        await router.connect(owner).addLiquidityETH(token1.address, amountADesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000, value: etherAmount });

        await token2.connect(owner).approve(router.address, amountADesired);
        await router.connect(owner).addLiquidityETH(token2.address, amountADesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000, value: etherAmount });

        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);
        await router.connect(owner).swapExactTokensForTokens(amountAMin, 1, [token1.address, token2.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });    
    
        const balanceTreasuryAfterToken1 = await token1.balanceOf(treasuryAccount.address);
        const balanceTreasuryAfterToken2 = await token2.balanceOf(treasuryAccount.address);

        expect(balanceTreasuryAfterToken1).equals(ethers.utils.parseUnits("20", 12));
        expect(balanceTreasuryAfterToken2).equals("0");
    });

    it("swapTokensForExactETH in wETH pair", async () => {    
        const amountADesired = ethers.utils.parseUnits("25", 18);
        const etherAmount = ethers.utils.parseEther("20.0");
        
        const amountAMin = ethers.utils.parseUnits("20", 18);
        const amountBMin = ethers.utils.parseUnits("20", 18);

        await token1.connect(owner).approve(router.address, amountADesired);

        await router.connect(owner).addLiquidityETH(token1.address, amountADesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000, value: etherAmount });

        await token1.connect(owner).approve(router.address, amountADesired);

        await router.connect(owner).swapTokensForExactETH(ethers.utils.parseUnits("1", 18), amountAMin, [token1.address, weth.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });    
    
        const balanceTreasuryAfterWeth= await weth.balanceOf(treasuryAccount.address);
        const balanceTreasuryAfterToken1 = await token1.balanceOf(treasuryAccount.address);
        expect(balanceTreasuryAfterToken1).equals(ethers.utils.parseUnits("1.319748719843741", 15));
        expect(balanceTreasuryAfterWeth).equals("0");
    });

    it("swapTokensForExactTokens if wETH pairs do not exist", async () => {    
        const amountADesired = ethers.utils.parseUnits("25", 18);
        const amountBDesired = ethers.utils.parseUnits("25", 18);
        
        const amountAMin = ethers.utils.parseUnits("20", 18);
        const amountBMin = ethers.utils.parseUnits("20", 18);

        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);

        await router.connect(owner).addLiquidity(token1.address, token2.address, amountADesired, amountBDesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000 });
        
        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);
 
        await router.connect(owner).swapTokensForExactTokens(ethers.utils.parseUnits("1", 18), amountAMin, [token1.address, token2.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });    
    
        const balanceTreasuryAfterToken1 = await token1.balanceOf(treasuryAccount.address);
        const balanceTreasuryAfterToken2 = await token2.balanceOf(treasuryAccount.address);
        
        expect(balanceTreasuryAfterToken1).equals(ethers.utils.parseUnits("1.044801069876295", 15));
        expect(balanceTreasuryAfterToken2).equals("0");
    });

    it("swapTokensForExactTokens if wETH pair exist for first token", async () => {    
        const amountADesired = ethers.utils.parseUnits("25", 18);
        const amountBDesired = ethers.utils.parseUnits("25", 18);
        
        const amountAMin = ethers.utils.parseUnits("20", 18);
        const amountBMin = ethers.utils.parseUnits("20", 18);

        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);
        await router.connect(owner).addLiquidity(token1.address, token2.address, amountADesired, amountBDesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000 });
        
        const etherAmount = ethers.utils.parseEther("20.0");

        await token1.connect(owner).approve(router.address, amountADesired);
        await router.connect(owner).addLiquidityETH(token1.address, amountADesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000, value: etherAmount });

        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);
        await router.connect(owner).swapTokensForExactTokens(ethers.utils.parseUnits("1", 18), amountAMin, [token1.address, token2.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });    
    
        const balanceTreasuryAfterToken1 = await token1.balanceOf(treasuryAccount.address);
        const balanceTreasuryAfterToken2 = await token2.balanceOf(treasuryAccount.address);
    
        expect(balanceTreasuryAfterToken1).equals(ethers.utils.parseUnits("1.044801069876295", 15));
        expect(balanceTreasuryAfterToken2).equals("0");
    });

    it("swapTokensForExactTokens if wETH pair exist for second token", async () => {    
        const amountADesired = ethers.utils.parseUnits("25", 18);
        const amountBDesired = ethers.utils.parseUnits("25", 18);
        
        const amountAMin = ethers.utils.parseUnits("20", 18);
        const amountBMin = ethers.utils.parseUnits("20", 18);

        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);
        await router.connect(owner).addLiquidity(token1.address, token2.address, amountADesired, amountBDesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000 });
        
        const etherAmount = ethers.utils.parseEther("20.0");

        await token2.connect(owner).approve(router.address, amountADesired);
        await router.connect(owner).addLiquidityETH(token2.address, amountADesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000, value: etherAmount });

        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);
        await router.connect(owner).swapTokensForExactTokens(ethers.utils.parseUnits("1", 18), amountAMin, [token1.address, token2.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });    
    
        const balanceTreasuryAfterToken1 = await token1.balanceOf(treasuryAccount.address);
        const balanceTreasuryAfterToken2 = await token2.balanceOf(treasuryAccount.address);
    
        expect(balanceTreasuryAfterToken1).equals(ethers.utils.parseUnits("1.044801069876295", 15));
        expect(balanceTreasuryAfterToken2).equals("0");
    });

    it("swapTokensForExactTokens if wETH pairs exist", async () => {    
        const amountADesired = ethers.utils.parseUnits("20", 18);
        const amountBDesired = ethers.utils.parseUnits("20", 18);
        
        const amountAMin = ethers.utils.parseUnits("20", 18);
        const amountBMin = ethers.utils.parseUnits("20", 18);

        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);
        await router.connect(owner).addLiquidity(token1.address, token2.address, amountADesired, amountBDesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000 });
        
        const etherAmount = ethers.utils.parseEther("20.0");

        await token1.connect(owner).approve(router.address, amountADesired);
        await router.connect(owner).addLiquidityETH(token1.address, amountADesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000, value: etherAmount });

        await token2.connect(owner).approve(router.address, amountADesired);
        await router.connect(owner).addLiquidityETH(token2.address, amountADesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000, value: etherAmount });

        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);
        await router.connect(owner).swapTokensForExactTokens(ethers.utils.parseUnits("1", 18), amountAMin, [token1.address, token2.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });    
    
        const balanceTreasuryAfterToken1 = await token1.balanceOf(treasuryAccount.address);
        const balanceTreasuryAfterToken2 = await token2.balanceOf(treasuryAccount.address);

        expect(balanceTreasuryAfterToken1).equals(ethers.utils.parseUnits("1.055798975874", 12));
        expect(balanceTreasuryAfterToken2).equals("0");
    });

    it("swapExactTokensForTokens", async () => {    
        const amountADesired = ethers.utils.parseUnits("6205490", 18);
        const amountBDesired = ethers.utils.parseUnits("3754390", 18);
        
        const amountAMin = ethers.utils.parseUnits("6205490", 18);
        const amountBMin = ethers.utils.parseUnits("3754390", 18);

        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);
        await router.connect(owner).addLiquidity(token1.address, token2.address, amountADesired, amountBDesired, amountAMin, amountBMin, owner.address, Date.now() + 20, { gasLimit: 3045000 });
        
        const etherAmountForToken1 = ethers.utils.parseEther("500");
        const etherAmountForToken2 = ethers.utils.parseEther("500");

        await token1.connect(owner).approve(router.address, amountADesired);
        await router.connect(owner).addLiquidityETH(token1.address, amountADesired, amountAMin, etherAmountForToken1, owner.address, Date.now() + 20, { gasLimit: 3045000, value: etherAmountForToken1 });

        await token2.connect(owner).approve(router.address, amountADesired);
        await router.connect(owner).addLiquidityETH(token2.address, amountADesired, amountAMin, etherAmountForToken2, owner.address, Date.now() + 20, { gasLimit: 3045000, value: etherAmountForToken2 });

        for(let i:number = 1; i <= 25; i++) {
            await token1.connect(owner).approve(router.address, amountADesired);
            await router.connect(owner).swapExactTokensForTokens(ethers.utils.parseUnits("1", 18), 0, [token1.address, token2.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });   
            console.log(`${i}${colorReset}`);         
        }

        let balanceTreasuryAfterToken1 = await token1.balanceOf(treasuryAccount.address);
        let balanceTreasuryAfterToken2 = await token2.balanceOf(treasuryAccount.address);    

        expect(balanceTreasuryAfterToken1).equals(ethers.utils.parseUnits("25", 12));
        expect(balanceTreasuryAfterToken2).equals("0");

        await token1.connect(owner).approve(router.address, amountADesired);
        await router.connect(owner).swapExactTokensForTokens(ethers.utils.parseUnits("0.01", 18), 0, [token1.address, token2.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });    
        console.log(`26${colorReset}`)

        balanceTreasuryAfterToken1 = await token1.balanceOf(treasuryAccount.address);
        balanceTreasuryAfterToken2 = await token2.balanceOf(treasuryAccount.address);    

        expect(balanceTreasuryAfterToken1).equals(ethers.utils.parseUnits("25.01", 12));
        expect(balanceTreasuryAfterToken2).equals("0");

        await token1.connect(owner).approve(router.address, amountADesired);
        await router.connect(owner).swapExactTokensForTokens(ethers.utils.parseUnits("1000", 18), 0, [token1.address, token2.address], owner.address, Date.now() + 20, { gasLimit: 3045000 }); 
        console.log(`27${colorReset}`)

        for(let i:number = 1; i <= 25; i++) {
            await token2.connect(owner).approve(router.address, amountBDesired);
            await router.connect(owner).swapExactTokensForTokens(ethers.utils.parseUnits("1", 18), 0, [token2.address, token1.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });   
            console.log(`${i}${colorReset}`);         
        }

        balanceTreasuryAfterToken1 = await token1.balanceOf(treasuryAccount.address);
        balanceTreasuryAfterToken2 = await token2.balanceOf(treasuryAccount.address);    

        expect(balanceTreasuryAfterToken1).equals(ethers.utils.parseUnits("1025.01", 12));
        expect(balanceTreasuryAfterToken2).equals(ethers.utils.parseUnits("25", 12));

        for(let i:number = 0; i <= 19; i++) {
            let number = ethers.utils.parseEther("350000").toString();
            number = number.substring(0, number.length - i);
            console.log(number)
            
            await token1.connect(owner).approve(router.address, amountBDesired);
            await router.connect(owner).swapExactTokensForTokens(ethers.utils.parseUnits(number, 0), 0, [token1.address, token2.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });   
            console.log(`token1 ${i}`);     

            await token2.connect(owner).approve(router.address, amountBDesired);
            await router.connect(owner).swapExactTokensForTokens(ethers.utils.parseUnits(number, 0), 0, [token2.address, token1.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });   
            console.log(`token2 ${i}\n`);         
        }

        for(let i:number = 0; i <= 15; i++) {
            let number = ethers.utils.parseEther("100").toString();
            number = number.substring(0, number.length - i);
            console.log(number)

            await token1.connect(owner).approve(router.address, amountBDesired);
            await router.connect(owner).swapExactTokensForETH(ethers.utils.parseUnits(number, 0), 0, [token1.address, weth.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });   
            console.log(`token1 ${i}`);     

            await token2.connect(owner).approve(router.address, amountBDesired);
            await router.connect(owner).swapExactTokensForETH(ethers.utils.parseUnits(number, 0), 0, [token2.address, weth.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });   
            console.log(`token2 ${i}\n`);         
        }

        for(let i:number = 0; i <= 19; i++) {
            let number = ethers.utils.parseEther("100").toString();
            number = number.substring(0, number.length - i);
            console.log(number)

            await router.connect(owner).swapExactETHForTokens(0, [weth.address, token1.address], owner.address, Date.now() + 20, { value: ethers.utils.parseUnits(number, 0), gasLimit: 3045000 });   
            console.log(`token1 ${i}`);     

            await router.connect(owner).swapExactETHForTokens( 0, [weth.address, token2.address], owner.address, Date.now() + 20, { value: ethers.utils.parseUnits(number, 0), gasLimit: 3045000 });   
            console.log(`token2 ${i}\n`);         
        }

        for(let i:number = 0; i <= 19; i++) {
            let number = ethers.utils.parseEther("100").toString();
            number = number.substring(0, number.length - i);
            console.log(number)

            await token1.connect(owner).approve(router.address, amountBDesired);
            await router.connect(owner).swapExactTokensForTokens(ethers.utils.parseUnits(number, 0), 0, [token1.address, token2.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });   
            console.log(`token1 ${i}`);     

            await token2.connect(owner).approve(router.address, amountBDesired);
            await router.connect(owner).swapExactTokensForTokens(ethers.utils.parseUnits(number, 0), 0, [token2.address, token1.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });   
            console.log(`token2 ${i}\n`);         
        }

        await token1.connect(owner).approve(router.address, amountBDesired);
        await router.connect(owner).swapExactTokensForTokens(ethers.utils.parseUnits("1", 6), 0, [token1.address, token2.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });   

        await token2.connect(owner).approve(router.address, amountBDesired);
        await router.connect(owner).swapExactTokensForTokens(ethers.utils.parseUnits("1", 6), 0, [token2.address, token1.address], owner.address, Date.now() + 20, { gasLimit: 3045000 });   

    });
}) 
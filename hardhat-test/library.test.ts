import {ethers} from "hardhat";
import { UniswapV2Router02, UniswapV2Factory, UniswapV2Factory__factory, UniswapV2Router02__factory, ERC20test, ERC20test__factory, WETH, WETH__factory, NewWETH, NewWETH__factory, UniswapDAO, UniswapDAO__factory } from "../typechain-types";
import {expect} from "chai";
import { BigNumber, utils } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("\x1b[33mUniswap Library test\x1b[0m\n", () => {
    const beforeTest = "\t";
    const colorGreen = "\x1b[32m";
    const colorBlue = "\x1b[36m";
    const colorReset = "\x1b[0m";

    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const someAddress = "0xcafecafecafecafecafecafecafecafecafecafe";
    let provider: any;
    let accounts: SignerWithAddress[];

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
    
        accounts = await ethers.getSigners();

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

        const totalSupply = ethers.utils.parseUnits("1000", 18);
        token1 = await (await new ERC20test__factory(owner).deploy(totalSupply, "MyToken1", "MYT1")).deployed();
        token2 = await (await new ERC20test__factory(owner).deploy(totalSupply, "MyToken2", "MYT2")).deployed();

        const amountADesired = ethers.utils.parseUnits("25", 18);
        const amountBDesired = ethers.utils.parseUnits("25", 18);
        
        await token1.connect(owner).approve(router.address, amountADesired);
        await token2.connect(owner).approve(router.address, amountBDesired);
        await router.connect(owner).addLiquidity(token1.address, token2.address, amountADesired, amountBDesired, amountADesired, amountBDesired, owner.address, Date.now() + 20, { gasLimit: 3045000 });

        await token1.connect(owner).approve(router.address, amountADesired);
        await router.connect(owner).addLiquidityETH(token1.address, amountADesired, amountADesired, amountBDesired, owner.address, Date.now() + 20, { gasLimit: 3045000, value: amountBDesired });
    });

    it('quote', async () => {
        expect(await router.quote(ethers.utils.parseUnits("1", 18), ethers.utils.parseUnits("100", 18), ethers.utils.parseUnits("200", 18))).equals(ethers.utils.parseUnits("2", 18));

        expect(await router.quote(ethers.utils.parseUnits("2", 18), ethers.utils.parseUnits("200", 18), ethers.utils.parseUnits("100", 18))).equals(ethers.utils.parseUnits("1", 18));

        await expect(router.quote(ethers.utils.parseUnits("0", 18), ethers.utils.parseUnits("100", 18), ethers.utils.parseUnits("200", 18))).revertedWith('UniswapV2Library: INSUFFICIENT_AMOUNT');

        await expect(router.quote(ethers.utils.parseUnits("1", 18), ethers.utils.parseUnits("0", 18), ethers.utils.parseUnits("200", 18))).revertedWith('UniswapV2Library: INSUFFICIENT_LIQUIDITY');

        await expect(router.quote(ethers.utils.parseUnits("1", 18), ethers.utils.parseUnits("100", 18), ethers.utils.parseUnits("0", 18))).revertedWith('UniswapV2Library: INSUFFICIENT_LIQUIDITY');
      });

      it('getAmountOut', async () => {
        expect(await router.getAmountOut(ethers.utils.parseUnits("2", 18), ethers.utils.parseUnits("100", 18), ethers.utils.parseUnits("100", 18))).equals(ethers.utils.parseUnits("1.955016961782065611", 18));
        
        await expect(router.getAmountOut(ethers.utils.parseUnits("0", 18), ethers.utils.parseUnits("100", 18), ethers.utils.parseUnits("100", 18))).revertedWith('UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT');
        
        await expect(router.getAmountOut(ethers.utils.parseUnits("2", 18), ethers.utils.parseUnits("0", 18), ethers.utils.parseUnits("100", 18))).revertedWith('UniswapV2Library: INSUFFICIENT_LIQUIDITY');

        await expect(router.getAmountOut(ethers.utils.parseUnits("2", 18), ethers.utils.parseUnits("100", 18), ethers.utils.parseUnits("0", 18))).revertedWith('UniswapV2Library: INSUFFICIENT_LIQUIDITY');
      });

      it('getAmountIn', async () => {
        expect(await router.getAmountIn(ethers.utils.parseUnits("1", 18), ethers.utils.parseUnits("100", 18), ethers.utils.parseUnits("100", 18))).equals(ethers.utils.parseUnits("1.013140431395195689", 18));

        await expect(router.getAmountIn(ethers.utils.parseUnits("0", 18), ethers.utils.parseUnits("100", 18), ethers.utils.parseUnits("100", 18))).revertedWith('UniswapV2Library: INSUFFICIENT_OUTPUT_AMOUNT');

        await expect(router.getAmountIn(ethers.utils.parseUnits("1", 18), ethers.utils.parseUnits("0", 18), ethers.utils.parseUnits("100", 18))).revertedWith('UniswapV2Library: INSUFFICIENT_LIQUIDITY');

        await expect(router.getAmountIn(ethers.utils.parseUnits("1", 18), ethers.utils.parseUnits("100", 18), ethers.utils.parseUnits("0", 18))).revertedWith('UniswapV2Library: INSUFFICIENT_LIQUIDITY');
      });

      it('getAmountsOut', async () => {
        await expect(router.getAmountsOut(ethers.utils.parseUnits("2", 18), [token1.address])).revertedWith('UniswapV2Library: INVALID_PATH');

        const path = [token1.address, token2.address];
        expect(await router.getAmountsOut(ethers.utils.parseUnits("2", 18), path)).deep.equals([ethers.utils.parseUnits("2", 18), ethers.utils.parseUnits("1.846706675557531303", 18)])
      });

      it('getAmountsIn', async () => {
        await expect(router.getAmountsIn(ethers.utils.parseUnits("1", 18), [token1.address])).revertedWith('UniswapV2Library: INVALID_PATH');

        const path = [token1.address, token2.address];
        expect(await router.getAmountsIn(ethers.utils.parseUnits("1", 18), path)).deep.equals([ethers.utils.parseUnits("1.044801069876295554", 18), ethers.utils.parseUnits("1", 18)]);
      });
    
});
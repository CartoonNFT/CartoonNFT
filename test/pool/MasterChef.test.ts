import { network, ethers, getNamedAccounts, waffle } from "hardhat"
import * as chai from "chai"
import * as chaiAsPromised from "chai-as-promised"
import { check } from "prettier"

chai.should()
chai.use(chaiAsPromised)

const { expect } = chai
describe("MasterChef", function () {
  before(async function () {
    this.Token = await ethers.getContractFactory("CartoonToken")
    this.MasterChef = await ethers.getContractFactory("MasterChef")
    this.mdexToken = await ethers.getContractAt("IERC20", "0x25D2e80cB6B86881Fd7e07dd263Fb79f4AbE033c")
    this.bob = await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x631fc1ea2270e98fbd9d92658ece0f5a269aa161"],
    })
    this.bob = await ethers.getSigner("0x631fc1ea2270e98fbd9d92658ece0f5a269aa161")
    ;[this.alice, , this.carol, this.dave, this.eve, this.isaac] = await ethers.getSigners()

    const { WBNB, USDT, MDXFactory, MDXRouter } = await getNamedAccounts()
    this.USDT = USDT
    this.WBNB = WBNB
    this.mdxFactory = await ethers.getContractAt("IMdexFactory", MDXFactory)
    this.mdxRouter = await ethers.getContractAt("IMdexRouter", MDXRouter)

    this.startBlockNumber = await ethers.provider.getBlockNumber()
    // MasterChef
    this.cto = await this.Token.deploy(this.alice.address)
    await this.cto.deployed()

    await this.cto.grantRole(await this.cto.MINT_ROLE(), this.alice.address)
    await this.cto.mint(this.bob.address, ethers.utils.parseUnits("1000", 18))
  })
  beforeEach(async function () {
    this.masterChef = await this.MasterChef.deploy(this.cto.address, ethers.utils.parseUnits("1", 18), this.startBlockNumber)
    await this.masterChef.deployed()

    // createPair
    if ((await this.mdxFactory.getPair(this.cto.address, this.USDT)) == "0x0000000000000000000000000000000000000000") {
      await this.mdxFactory.createPair(this.cto.address, this.USDT)
    }
    if ((await this.mdxFactory.getPair(this.cto.address, this.WBNB)) == "0x0000000000000000000000000000000000000000") {
      await this.mdxFactory.createPair(this.cto.address, this.WBNB)
    }
    this.cto_usdt = await this.mdxFactory.getPair(this.cto.address, this.USDT)
    this.cto_wbnb = await this.mdxFactory.getPair(this.cto.address, this.WBNB)
    expect(this.cto_usdt).not.equal("0x0000000000000000000000000000000000000000")
    expect(this.cto_wbnb).not.equal("0x0000000000000000000000000000000000000000")
    await this.cto.grantRole(await this.cto.MINT_ROLE(), this.masterChef.address)
    await this.masterChef.add(
      10, // allocPoint
      this.cto_wbnb,
      true
    )
    await this.masterChef.add(
      10, // allocPoint
      this.cto_usdt,
      true
    )
  })
  it("should be check property", async function () {
    expect(await this.masterChef.cto()).equal(this.cto.address)
    expect(await this.masterChef.ctoPerBlock()).equal(ethers.utils.parseUnits("1", 18))
    expect(await this.masterChef.totalAllocPoint()).equal(20)
    expect(await this.masterChef.startBlock()).equal(this.startBlockNumber)
    expect(await this.masterChef.poolLength()).equal(2)
  })

  it("should be add pool", async function () {
    expect(await this.masterChef.poolLength()).equal(2)
    await this.masterChef.add(
      11, // allocPoint
      this.cto_usdt,
      false
    )
    expect(await this.masterChef.poolLength()).equal(3)
    const poolInfo = await this.masterChef.poolInfo(2)
    expect(poolInfo["allocPoint"]).equal(11)
    expect(await this.masterChef.totalAllocPoint()).equal(31)
  })
  it("should be check pool", async function () {
    const poolInfo = await this.masterChef.poolInfo(0)
    expect(poolInfo["lpToken"]).equal(this.cto_wbnb)
    expect(poolInfo["accCtoPerShare"]).equal(0)
    expect(poolInfo["allocPoint"]).equal(10)

    const poolInfo2 = await this.masterChef.poolInfo(1)
    expect(poolInfo2["lpToken"]).equal(this.cto_usdt)
    expect(poolInfo2["accCtoPerShare"]).equal(0)
    expect(poolInfo2["allocPoint"]).equal(10)
  })
  it("should be change allocPoint", async function () {
    await this.masterChef.set(0, 11, true)
    let poolInfo = await this.masterChef.poolInfo(0)
    expect(poolInfo["allocPoint"]).equal(11)
    expect(await this.masterChef.totalAllocPoint()).equal(21)
    await this.masterChef.set(0, 12, false)
    poolInfo = await this.masterChef.poolInfo(0)
    expect(poolInfo["allocPoint"]).equal(12)
    expect(await this.masterChef.totalAllocPoint()).equal(22)
  })
  context("CTO-BNB", async function () {
    before(async function () {
      this.cto_wbnb_pair = await ethers.getContractAt("IERC20", this.cto_wbnb)
      expect(await this.cto_wbnb_pair.balanceOf(this.bob.address)).equal(0)
    })
    beforeEach(async function () {
      let bobCtoBalance = await this.cto.balanceOf(this.bob.address)
      let bobBalance = await this.bob.getBalance()
      const deadline = Math.round(new Date(new Date().getTime() + 3600 * 1000).getTime() / 1000)
      await this.mdxRouter
        .connect(this.bob)
        .addLiquidityETH(this.cto.address, ethers.utils.parseEther("1"), 0, 0, this.bob.address, deadline, {
          value: ethers.utils.parseEther("1"),
        })
        .should.be.rejectedWith("TransferHelper: TRANSFER_FROM_FAILED")

      await this.cto.connect(this.bob).approve(this.mdxRouter.address, ethers.utils.parseEther("1"))
      await this.mdxRouter.connect(this.bob).addLiquidityETH(this.cto.address, ethers.utils.parseEther("1"), 0, 0, this.bob.address, deadline, {
        value: ethers.utils.parseEther("1"),
      })
      const liquidity = await this.cto_wbnb_pair.balanceOf(this.bob.address)
      expect(liquidity).not.null
      expect(bobBalance.sub(ethers.utils.parseEther("1"))).to.above(await this.bob.getBalance())
      expect(bobCtoBalance.sub(ethers.utils.parseEther("1"))).equal(await this.cto.balanceOf(this.bob.address))

      await this.masterChef.connect(this.bob).deposit(0, liquidity).should.be.rejectedWith("SafeMath: subtraction overflow")
      await this.cto_wbnb_pair.connect(this.bob).approve(this.masterChef.address, liquidity)
      await this.masterChef.connect(this.bob).deposit(0, liquidity)
    })
    it("deposit", async function () {
      expect(await this.cto_wbnb_pair.balanceOf(this.bob.address)).equal(0)
      const liquidity = await this.cto_wbnb_pair.balanceOf(this.masterChef.address)
      let [amount, amountDebt] = await this.masterChef.userInfo(0, this.bob.address)
      expect(amount).equal(liquidity)
    })
    it("pending cto", async function () {
      expect(await this.masterChef.pendingCto(0, this.bob.address)).equal(0)
      await this.masterChef.updatePool(0)
      expect(await this.masterChef.pendingCto(0, this.bob.address)).above(0)
      await network.provider.send("evm_mine", [])
      expect(await this.masterChef.pendingCto(0, this.bob.address)).above(0)
    })
    it("claim reward (withdraw)", async function () {
      const oldBalance = await this.cto.balanceOf(this.bob.address)
      await this.masterChef.connect(this.bob).withdraw(0, 0)
      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).above(0)
    })
    it("claim reward (deposit)", async function () {
      const oldBalance = await this.cto.balanceOf(this.bob.address)
      await this.masterChef.connect(this.bob).deposit(0, 0)
      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).above(0)
    })
    it("withdraw", async function () {
      const [amount] = await this.masterChef.userInfo(0, this.bob.address)
      const oldBalance = await this.cto.balanceOf(this.bob.address)
      expect(await this.cto_wbnb_pair.balanceOf(this.bob.address)).equal(0)
      await this.masterChef.connect(this.bob).withdraw(0, amount.add(1)).should.be.rejectedWith("withdraw: not good")
      await this.masterChef.connect(this.bob).withdraw(0, amount)
      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).above(0)
      expect(await this.cto_wbnb_pair.balanceOf(this.bob.address)).equal(amount)
    })
    it("emergencyWithdraw", async function () {
      const [amount] = await this.masterChef.userInfo(0, this.bob.address)
      const oldBalance = await this.cto.balanceOf(this.bob.address)
      expect(await this.cto_wbnb_pair.balanceOf(this.bob.address)).equal(0)
      await this.masterChef.connect(this.bob).emergencyWithdraw(0)
      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).equal(0)
      expect(await this.cto_wbnb_pair.balanceOf(this.bob.address)).equal(amount)
    })
  })
})

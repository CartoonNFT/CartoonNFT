import { deployments, ethers, getNamedAccounts } from "hardhat"
import * as chai from "chai"
import * as chaiAsPromised from "chai-as-promised"

chai.should()
chai.use(chaiAsPromised)

const { expect } = chai
describe("TimeLock", function () {
  before(async function () {
    this.Token = await ethers.getContractFactory("CartoonToken")
    this.TimeLock = await ethers.getContractFactory("TimeLock")
    this.signers = await ethers.getSigners()
    ;[this.alice, this.bob, this.carol, this.dave, this.eve, this.isaac] = await ethers.getSigners()
  })
  beforeEach(async function () {
    const currentBlockNumber = await ethers.provider.getBlockNumber()
    const currentTimeStamp = (await ethers.provider.getBlock(currentBlockNumber)).timestamp
    this.token = await this.Token.deploy(this.alice.address)
    await this.token.deployed()
    this.timeLock = await this.TimeLock.deploy(
      this.bob.address,
      this.token.address,
      ethers.utils.parseUnits("1", 18), // per quarter amount
      currentTimeStamp,
      0,
      "info"
    )
    await this.timeLock.deployed()
    await this.token.grantRole(await this.token.MINT_ROLE(), this.alice.address)
    await this.token.mint(this.timeLock.address, ethers.utils.parseUnits("9", 18))
  })
  it("should be withdraw", async function () {
    // start time
    expect(await this.timeLock.getBalance()).equal(ethers.utils.parseUnits("9", 18))
    expect(await this.timeLock.getReward()).equal(0)
    await this.timeLock.withDraw().should.be.rejectedWith("TimeLock: no reward")
    let bobBalance = await this.token.balanceOf(this.bob.address)
    let timeLockBalance = await this.token.balanceOf(this.timeLock.address)

    for (let i = 0; i < 7; i++) {
      // each quarter
      expect(await this.timeLock.getReward()).equal(ethers.utils.parseUnits("0", 18))
      await ethers.provider.send("evm_increaseTime", [3600 * 24 * 91])
      await ethers.provider.send("evm_mine", [])
      expect(await this.timeLock.getReward()).equal(ethers.utils.parseUnits("1", 18))
      await this.timeLock.withDraw()
      bobBalance = bobBalance.add(ethers.utils.parseUnits("1", 18))
      timeLockBalance = timeLockBalance.sub(ethers.utils.parseUnits("1", 18))
      expect(await this.token.balanceOf(this.bob.address)).equal(bobBalance)
      expect(await this.token.balanceOf(this.timeLock.address)).equal(timeLockBalance)
      expect(await this.timeLock.hasReward()).equal(bobBalance)
    }
    // last reward
    expect(await this.timeLock.getReward()).equal(ethers.utils.parseUnits("0", 18))
    await ethers.provider.send("evm_increaseTime", [3600 * 24 * 91])
    await ethers.provider.send("evm_mine", [])
    expect(await this.timeLock.getReward()).equal(ethers.utils.parseUnits("2", 18))
    await this.timeLock.withDraw()
    bobBalance = bobBalance.add(ethers.utils.parseUnits("2", 18))
    timeLockBalance = timeLockBalance.sub(ethers.utils.parseUnits("2", 18))
    expect(await this.token.balanceOf(this.bob.address)).equal(bobBalance)
    expect(await this.token.balanceOf(this.timeLock.address)).equal(timeLockBalance)
    expect(await this.timeLock.hasReward()).equal(bobBalance)

    // run out
    expect((await this.timeLock.startTime()).add(3600 * 24 * 91 * 8)).to.not.be.above(
      (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
    )
    await this.timeLock.withDraw().should.be.rejectedWith("TimeLock: no reward")
    expect(await this.token.balanceOf(this.bob.address)).equal(ethers.utils.parseUnits("9", 18))
    expect(await this.timeLock.hasReward()).equal(ethers.utils.parseUnits("9", 18))
    expect(await this.timeLock.getBalance()).equal(0)
    expect(await this.timeLock.getReward()).equal(0)
  })
  it("should be change beneficiary", async function () {
    await this.timeLock.setBeneficiary(this.carol.address).should.be.rejectedWith("TimeLock: Not beneficiary")
    await this.timeLock.connect(this.bob).setBeneficiary(this.carol.address)
    expect(await this.timeLock.beneficiary()).equal(this.carol.address)
  })
})

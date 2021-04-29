import { deployments, ethers, getNamedAccounts } from "hardhat"
import * as chai from "chai"
import * as chaiAsPromised from "chai-as-promised"

chai.should()
chai.use(chaiAsPromised)

const { expect } = chai
describe("CartoonToken", function () {
  before(async function () {
    this.Token = await ethers.getContractFactory("CartoonToken")
    this.signers = await ethers.getSigners()
    ;[this.alice, this.bob, this.carol, this.dave, this.eve, this.isaac] = await ethers.getSigners()
    // console.log("alice:", this.alice.address)
    // console.log("bob:", this.bob.address)
    // console.log("carol:", this.carol.address)
    // console.log("dave:", this.dave.address)
    // console.log("eve:", this.eve.address)
    // console.log("isaac:", this.isaac.address)
  })
  beforeEach(async function () {
    this.token = await this.Token.deploy(this.alice.address)
    await this.token.deployed()
    // console.log("deployed token", this.token.address)
  })
  it("role check", async function () {
    expect(await this.token.hasRole(await this.token.ADMIN_ROLE(), this.alice.address)).to.be.true
    expect(await this.token.getRoleAdmin(await this.token.MINT_ROLE())).equal(await this.token.ADMIN_ROLE())
  })
  it("should be check token info", async function () {
    expect(await this.token.name()).equal("CartoonToken")
    expect(await this.token.symbol()).equal("CTO")
    expect(await this.token.decimals()).equal(18)
    expect(await this.token.cap()).equal(ethers.BigNumber.from("130000000").mul(ethers.BigNumber.from("10").pow(18)))
  })
  it("should be check mint", async function () {
    await this.token.mint(this.bob.address, 100).should.be.rejectedWith("Must have mint role")
    await this.token.grantRole(await this.token.MINT_ROLE(), this.alice.address)
    await this.token.mint(this.bob.address, 100)
    expect(await this.token.totalSupply()).equal(100)
    expect(await this.token.balanceOf(this.bob.address)).equal(100)
  })
  it("should be revoke role", async function () {
    await this.token.grantRole(await this.token.MINT_ROLE(), this.bob.address)
    await this.token.connect(this.bob).mint(this.bob.address, 100)
    expect(await this.token.totalSupply()).equal(100)
    expect(await this.token.balanceOf(this.bob.address)).equal(100)

    await this.token.revokeRole(await this.token.MINT_ROLE(), this.bob.address)
    await this.token.connect(this.bob).mint(this.bob.address, 100).should.be.rejectedWith("Must have mint role")
  })
  it("should be check cap", async function () {
    await this.token.grantRole(await this.token.MINT_ROLE(), this.alice.address)
    await this.token.mint(this.bob.address, ethers.BigNumber.from("130000000").mul(ethers.BigNumber.from("10").pow(18)))
    expect(await this.token.totalSupply()).equal(await this.token.cap())
    await this.token.mint(this.bob.address, 1).should.be.rejectedWith("ERC20Capped: cap exceeded")
  })
})

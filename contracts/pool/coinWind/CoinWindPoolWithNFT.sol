// SPDX-License-Identifier: MIT
pragma solidity >=0.7.4;
pragma experimental ABIEncoderV2;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/utils/EnumerableSet.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

import '../../CartoonToken.sol';
import '../../CardSpec.sol';
import '../../ERC721Ex.sol';
import '../../interfaces/ICoinWind.sol';
import '../../interfaces/IWETH.sol';
import '../../libraries/TransferHelper.sol';

// Have fun reading it. Hopefully it's bug-free. God bless.
contract CoinWindPoolWithNFT is Ownable, Pausable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    // Info of each user.
    struct UserInfo {
        uint256 amount; // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
        uint256 tokenId; // nft tokenId;
    }
    // Info of each pool.
    struct PoolInfo {
        IERC20 lpToken; // Address of LP token contract.
        uint256 lpAmount; // current lp amount;
        uint256 allocPoint; // How many allocation points assigned to this pool. CTOs to distribute per block.
        uint256 lastRewardBlock; // Last block number that CTOs distribution occurs.
        uint256 accCtoPerShare; // Accumulated CTOs per share, times 1e12. See below.
        uint256 tokenIdentity;
    }

    address public devaddr;
    // card spec
    CardSpec public cardSpec;
    // erc721 token
    ERC721Ex public nCto;
    // swap token
    IERC20 public swapToken;
    // weth
    IWETH public WETH;
    // invest aggregator
    ICoinWind public coinWind;
    // The CartoonToken TOKEN!
    CartoonToken public cto;
    // CTO tokens created per block.
    uint256 public ctoPerBlock;
    // Info of each pool.
    PoolInfo[] public poolInfo;
    // Info of each user that stakes LP tokens.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    // Total allocation poitns. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;
    // The block number when CTO mining starts.
    uint256 public startBlock;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);

    constructor(
        CartoonToken _cto,
        ERC721Ex _nCto,
        IERC20 _swapToken,
        IWETH _WETH,
        ICoinWind _coinWind,
        uint256 _ctoPerBlock,
        uint256 _startBlock,
        CardSpec _cardSpec,
        address _devaddr
    ) {
        cto = _cto;
        nCto = _nCto;
        swapToken = _swapToken;
        WETH = _WETH;
        coinWind = _coinWind;
        ctoPerBlock = _ctoPerBlock;
        startBlock = _startBlock;
        cardSpec = _cardSpec;
        devaddr = _devaddr;
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    // Add a new lp to the pool. Can only be called by the owner.
    // XXX DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    function add(
        uint256 _allocPoint,
        IERC20 _lpToken,
        uint256 _cardId,
        bool _withUpdate
    ) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        totalAllocPoint = totalAllocPoint.add(_allocPoint);
        uint256 identity = cardSpec.getIdentityFromCardId(_cardId);
        poolInfo.push(
            PoolInfo({
                lpToken: _lpToken,
                lpAmount: 0,
                tokenIdentity: identity,
                allocPoint: _allocPoint,
                lastRewardBlock: lastRewardBlock,
                accCtoPerShare: 0
            })
        );
    }

    // Update the given pool's CTO allocation point. Can only be called by the owner.
    function set(
        uint256 _pid,
        uint256 _allocPoint,
        bool _withUpdate
    ) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);
        poolInfo[_pid].allocPoint = _allocPoint;
    }

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to) public pure returns (uint256) {
        return _to.sub(_from);
    }

    // View function to see pending CTOs on frontend.
    function pendingCto(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accCtoPerShare = pool.accCtoPerShare;
        uint256 lpSupply = pool.lpAmount;
        if (block.number > pool.lastRewardBlock && lpSupply != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            uint256 ctoReward = multiplier.mul(ctoPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
            accCtoPerShare = accCtoPerShare.add(ctoReward.mul(1e12).div(lpSupply));
        }
        return user.amount.mul(accCtoPerShare).div(1e12).sub(user.rewardDebt);
    }

    // Update reward vairables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }
        uint256 lpSupply = pool.lpAmount;
        if (lpSupply == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
        uint256 ctoReward = multiplier.mul(ctoPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
        cto.mint(address(this), ctoReward);
        pool.accCtoPerShare = pool.accCtoPerShare.add(ctoReward.mul(1e12).div(lpSupply));
        pool.lastRewardBlock = block.number;
    }

    // Deposit LP tokens to MasterChef for CTO allocation.
    function deposit(
        uint256 _pid,
        uint256 _amount,
        uint256 _tokenId
    ) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);

        if (user.tokenId == 0) {
            require(cardSpec.getTokenIdentity(_tokenId) == pool.tokenIdentity, 'token identity mismatch');
            TransferHelper.safeTransferFrom(address(nCto), msg.sender, address(this), _tokenId);
            user.tokenId = _tokenId;
        }

        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accCtoPerShare).div(1e12).sub(user.rewardDebt);
            safeCtoTransfer(msg.sender, pending);
        }
        pool.lpToken.safeTransferFrom(msg.sender, address(this), _amount);
        user.amount = user.amount.add(_amount);
        user.rewardDebt = user.amount.mul(pool.accCtoPerShare).div(1e12);
        pool.lpAmount = pool.lpAmount.add(_amount);

        // if no paused, invested
        if (!paused()) {
            invest(_pid);
        }
        emit Deposit(msg.sender, _pid, _amount);
    }

    function depositETH(uint256 _pid, uint256 _tokenId) public payable {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(address(pool.lpToken) == address(WETH), 'wrong lp token');
        uint256 _amount = msg.value;
        WETH.deposit{value: _amount}();
        updatePool(_pid);

        if (user.tokenId == 0) {
            require(cardSpec.getTokenIdentity(_tokenId) == pool.tokenIdentity, 'token identity mismatch');
            TransferHelper.safeTransferFrom(address(nCto), msg.sender, address(this), _tokenId);
            user.tokenId = _tokenId;
        }

        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accCtoPerShare).div(1e12).sub(user.rewardDebt);
            safeCtoTransfer(msg.sender, pending);
        }
        user.amount = user.amount.add(_amount);
        user.rewardDebt = user.amount.mul(pool.accCtoPerShare).div(1e12);
        pool.lpAmount = pool.lpAmount.add(_amount);

        // if no paused, invested
        if (!paused()) {
            invest(_pid);
        }
        emit Deposit(msg.sender, _pid, _amount);
    }

    // Withdraw LP tokens from MasterChef.
    function withdraw(uint256 _pid, uint256 _amount) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, 'withdraw: not good');
        updatePool(_pid);
        uint256 pending = user.amount.mul(pool.accCtoPerShare).div(1e12).sub(user.rewardDebt);
        safeCtoTransfer(msg.sender, pending);
        user.amount = user.amount.sub(_amount);
        user.rewardDebt = user.amount.mul(pool.accCtoPerShare).div(1e12);

        // withdraw nft token
        if (user.amount == 0) {
            nCto.safeTransferFrom(address(this), msg.sender, user.tokenId);
            user.tokenId = 0;
        }

        // if balance not enough, withdraw from invests
        uint256 localBalance = pool.lpToken.balanceOf(address(this));
        if (localBalance < _amount) {
            coinWind.withdraw(address(pool.lpToken), _amount.sub(localBalance));
        }
        pool.lpToken.safeTransfer(address(msg.sender), _amount);
        pool.lpAmount = pool.lpAmount.sub(_amount);
        emit Withdraw(msg.sender, _pid, _amount);
    }

    function withdrawETH(uint256 _pid, uint256 _amount) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(address(pool.lpToken) == address(WETH), 'wrong lp token');
        require(user.amount >= _amount, 'withdraw: not good');
        updatePool(_pid);
        uint256 pending = user.amount.mul(pool.accCtoPerShare).div(1e12).sub(user.rewardDebt);
        safeCtoTransfer(msg.sender, pending);
        user.amount = user.amount.sub(_amount);
        user.rewardDebt = user.amount.mul(pool.accCtoPerShare).div(1e12);

        // withdraw nft token
        if (user.amount == 0) {
            nCto.safeTransferFrom(address(this), msg.sender, user.tokenId);
            user.tokenId = 0;
        }

        // if balance not enough, withdraw from invests
        uint256 localBalance = pool.lpToken.balanceOf(address(this));
        if (localBalance < _amount) {
            coinWind.withdraw(address(pool.lpToken), _amount.sub(localBalance));
        }
        pool.lpAmount = pool.lpAmount.sub(_amount);
        WETH.withdraw(_amount);
        TransferHelper.safeTransferETH(msg.sender, _amount);
        emit Withdraw(msg.sender, _pid, _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        uint256 localBalance = pool.lpToken.balanceOf(address(this));

        if (localBalance < user.amount) {
            coinWind.withdraw(address(pool.lpToken), user.amount.sub(localBalance));
        }
        pool.lpToken.safeTransfer(address(msg.sender), user.amount);
        pool.lpAmount = pool.lpAmount.sub(user.amount);
        nCto.safeTransferFrom(address(this), msg.sender, user.tokenId);
        emit EmergencyWithdraw(msg.sender, _pid, user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
        user.tokenId = 0;
    }

    function emergencyWithdrawETH(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        require(address(pool.lpToken) == address(WETH), 'wrong lp token');
        UserInfo storage user = userInfo[_pid][msg.sender];

        uint256 localBalance = pool.lpToken.balanceOf(address(this));
        if (localBalance < user.amount) {
            coinWind.withdraw(address(pool.lpToken), user.amount.sub(localBalance));
        }

        pool.lpAmount = pool.lpAmount.sub(user.amount);
        nCto.safeTransferFrom(address(this), msg.sender, user.tokenId);
        emit EmergencyWithdraw(msg.sender, _pid, user.amount);
        WETH.withdraw(user.amount);
        uint256 amountETH = user.amount;
        user.amount = 0;
        user.tokenId = 0;
        user.rewardDebt = 0;
        TransferHelper.safeTransferETH(msg.sender, amountETH);
    }

    // Safe cto transfer function, just in case if rounding error causes pool to not have enough CTOs.
    function safeCtoTransfer(address _to, uint256 _amount) internal {
        uint256 ctoBal = cto.balanceOf(address(this));
        if (_amount > ctoBal) {
            cto.transfer(_to, ctoBal);
        } else {
            cto.transfer(_to, _amount);
        }
    }

    // do coinWind deposit
    function invest(uint256 _pid) public whenNotPaused {
        PoolInfo storage pool = poolInfo[_pid];

        uint256 coinWindPid = coinWind.TokenOfPid(address(pool.lpToken));
        ICoinWind.PoolInfo memory info = coinWind.poolInfo(coinWindPid);
        uint256 amount = pool.lpToken.balanceOf(address(this));

        // no limit,if zero
        if (info.totalAmountLimit != 0) {
            uint256 remainingAmount = info.totalAmountLimit.sub(info.totalAmount);
            if (amount > remainingAmount) {
                amount = remainingAmount;
            }
        }
        pool.lpToken.approve(address(coinWind), amount);
        coinWind.deposit(address(pool.lpToken), amount);
    }

    //Be careful of gas spending!
    function massInvest() external whenNotPaused {
        for (uint256 _pid; _pid < poolInfo.length; _pid++) {
            invest(_pid);
        }
    }

    // emergencyWithdrawAllFromInvest from invest. Be careful of gas spending!
    function emergencyWithdrawAllFromInvest() external onlyOwner whenPaused {
        for (uint256 _pid; _pid < poolInfo.length; ++_pid) {
            PoolInfo storage pool = poolInfo[_pid];
            coinWind.withdrawAll(address(pool.lpToken));
        }
    }

    function emergencyWithdrawFromInvest(uint256 _pid) external onlyOwner whenPaused {
        PoolInfo storage pool = poolInfo[_pid];
        coinWind.withdrawAll(address(pool.lpToken));
    }

    function pause() external onlyOwner whenNotPaused {
        _pause();
    }

    function unpause() external onlyOwner whenPaused {
        _unpause();
    }

    function dev(address _devaddr) external {
        require(devaddr == msg.sender, 'wut?');
        devaddr = _devaddr;
    }

    function claim() external {
        require(devaddr == msg.sender, 'wut?');
        swapToken.safeTransfer(devaddr, swapToken.balanceOf(address(this)));
    }

    receive() external payable {}
}

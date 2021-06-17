// SPDX-License-Identifier: MIT

pragma solidity >=0.7.4;
pragma experimental ABIEncoderV2;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/utils/EnumerableSet.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '../CartoonToken.sol';
import '../ERC721Ex.sol';
import '../libraries/TransferHelper.sol';

// Have fun reading it. Hopefully it's bug-free. God bless.
contract MasterChefNFT is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.UintSet;
    // Info of each user.
    struct UserInfo {
        EnumerableSet.UintSet tokenIds;
        uint256 rewardDebt; // Reward debt. See explanation below.
    }
    // Info of each pool.
    struct PoolInfo {
        uint256 allocPoint; // How many allocation points assigned to this pool. CTOs to distribute per block.
        uint256 lastRewardBlock; // Last block number that CTOs distribution occurs.
        uint256 accCtoPerShare; // Accumulated CTOs per share, times 1e12. See below.
        uint256 tokenIdentity;
        uint256 tokenAmount;
    }
    // The CTO TOKEN!
    CartoonToken public cto;
    // card spec
    CardSpec public cardSpec;
    // erc721 token
    ERC721Ex public nCto;
    // CTO tokens created per block.
    uint256 public ctoPerBlock;
    // Info of each pool.
    PoolInfo[] public poolInfo;
    // Info of each user that stakes LP tokens.
    mapping(uint256 => mapping(address => UserInfo)) private userInfo;
    // Total allocation poitns. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;
    // The block number when CTO mining starts.
    uint256 public startBlock;
    event Deposit(address indexed user, uint256 indexed pid, uint256 tokenId);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 tokenId);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 tokenId);

    constructor(
        CartoonToken _cto,
        ERC721Ex _nCto,
        uint256 _ctoPerBlock,
        uint256 _startBlock,
        CardSpec _cardSpec
    ) {
        cto = _cto;
        nCto = _nCto;
        ctoPerBlock = _ctoPerBlock;
        startBlock = _startBlock;
        cardSpec = _cardSpec;
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    function getUserInfo(uint256 _pid, address _from) external view returns (uint256 tokenAmount, uint256 rewardDebt) {
        UserInfo storage user = userInfo[_pid][_from];
        return (user.tokenIds.length(), user.rewardDebt);
    }

    function containsUserTokenId(
        uint256 _pid,
        address _from,
        uint256 _tokenId
    ) external view returns (bool) {
        return userInfo[_pid][_from].tokenIds.contains(_tokenId);
    }

    function getUserTokenIndex(
        uint256 _pid,
        address _from,
        uint256 _index
    ) external view returns (uint256) {
        return userInfo[_pid][_from].tokenIds.at(_index);
    }

    // Add a new lp to the pool. Can only be called by the owner.
    // XXX DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    function add(
        uint256 _allocPoint,
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
            PoolInfo({tokenIdentity: identity, allocPoint: _allocPoint, lastRewardBlock: lastRewardBlock, accCtoPerShare: 0, tokenAmount: 0})
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
        if (block.number > pool.lastRewardBlock && pool.tokenAmount != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            uint256 ctoReward = multiplier.mul(ctoPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
            accCtoPerShare = accCtoPerShare.add(ctoReward.mul(1e12).div(pool.tokenAmount));
        }
        return user.tokenIds.length().mul(accCtoPerShare).div(1e12).sub(user.rewardDebt);
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
        if (pool.tokenAmount == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
        uint256 ctoReward = multiplier.mul(ctoPerBlock).mul(pool.allocPoint).div(totalAllocPoint);

        // set allocPoint to zero if mint to cap
        cto.mint(address(this), ctoReward);
        pool.accCtoPerShare = pool.accCtoPerShare.add(ctoReward.mul(1e12).div(pool.tokenAmount));
        pool.lastRewardBlock = block.number;
    }

    // Deposit LP tokens to MasterChef for CTO allocation.
    function deposit(uint256 _pid, uint256 _tokenId) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);

        if (user.tokenIds.length() > 0) {
            uint256 pending = user.tokenIds.length().mul(pool.accCtoPerShare).div(1e12).sub(user.rewardDebt);
            safeCtoTransfer(msg.sender, pending);
        }
        if (_tokenId > 0) {
            require(cardSpec.getTokenIdentity(_tokenId) == pool.tokenIdentity, 'token identity mismatch');
            TransferHelper.safeTransferFrom(address(nCto), msg.sender, address(this), _tokenId);
            user.tokenIds.add(_tokenId);

            pool.tokenAmount = pool.tokenAmount.add(1);
        }
        user.rewardDebt = user.tokenIds.length().mul(pool.accCtoPerShare).div(1e12);
        emit Deposit(msg.sender, _pid, _tokenId);
    }

    // Withdraw LP tokens from MasterChef.
    function withdraw(uint256 _pid, uint256 _tokenId) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);
        uint256 pending = user.tokenIds.length().mul(pool.accCtoPerShare).div(1e12).sub(user.rewardDebt);
        safeCtoTransfer(msg.sender, pending);
        if (_tokenId > 0) {
            require(user.tokenIds.contains(_tokenId), 'withdraw: not good');
            user.tokenIds.remove(_tokenId);
            TransferHelper.safeTransferFrom(address(nCto), address(this), msg.sender, _tokenId);
            pool.tokenAmount = pool.tokenAmount.sub(1);
        }
        user.rewardDebt = user.tokenIds.length().mul(pool.accCtoPerShare).div(1e12);
        emit Withdraw(msg.sender, _pid, _tokenId);
    }

    function emergencyWithdraw(uint256 _pid, uint256 _tokenId) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.tokenIds.contains(_tokenId), 'emergencyWithdraw: not good');
        user.tokenIds.remove(_tokenId);
        TransferHelper.safeTransferFrom(address(nCto), address(this), msg.sender, _tokenId);
        pool.tokenAmount = pool.tokenAmount.sub(1);
        user.rewardDebt = user.tokenIds.length().mul(pool.accCtoPerShare).div(1e12);
        emit EmergencyWithdraw(msg.sender, _pid, _tokenId);
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
}

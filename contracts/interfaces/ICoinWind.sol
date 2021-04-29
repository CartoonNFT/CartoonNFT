// SPDX-License-Identifier: MIT

pragma solidity >=0.7.4;
pragma experimental ABIEncoderV2;

interface ICoinWind {
    struct PoolInfo {
        address token;
        uint256 lastRewardBlock;
        uint256 accMdxPerShare;
        uint256 govAccMdxPerShare;
        uint256 accMdxShare;
        uint256 totalAmount;
        uint256 totalAmountLimit;
        uint256 profit;
        uint256 earnLowerlimit;
        uint256 min;
        uint256 lastRewardBlockProfit;
    }
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 govRewardDebt;
    }

    function deposit(address token, uint256 wad) external; //47e7ef24

    function depositAll(address token) external; //9f0d5f27

    function withdraw(address token, uint256 wad) external; //f3fef3a3

    function withdrawAll(address token) external; //

    function poolInfo(uint256 _pid) external view returns (PoolInfo memory info);

    function poolLength() external view returns (uint256 length);

    function getPoolId(address token) external view returns (uint256 pid);

    function TokenOfPid(address token) external view returns (uint256 pid);

    function userlInfo(uint256 _pid, address from) external view returns (UserInfo memory info);
}

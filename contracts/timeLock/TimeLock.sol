// SPDX-License-Identifier: MIT

pragma solidity >=0.7.4;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../libraries/TransferHelper.sol';

contract TimeLock {
    using SafeMath for uint256;

    IERC20 public token;
    uint256 public constant PERIOD = 91 days;
    uint256 public constant CYCLE_TIMES = 8; // 2 years
    uint256 public fixedQuantity; // Quarter rewards are fixed
    uint256 public startTime;
    uint256 public delay;
    uint256 public cycle; // cycle already received
    uint256 public hasReward; // Rewards already withdrawn
    address public beneficiary;
    string public introduce;

    event WithDraw(address indexed operator, address indexed to, uint256 amount);

    constructor(
        address _beneficiary,
        address _token,
        uint256 _fixedQuantity,
        uint256 _startTime,
        uint256 _delay,
        string memory _introduce
    ) {
        require(_beneficiary != address(0) && _token != address(0), 'TimeLock: zero address');
        require(_fixedQuantity > 0, 'TimeLock: fixedQuantity is zero');
        beneficiary = _beneficiary;
        token = IERC20(_token);
        fixedQuantity = _fixedQuantity;
        delay = _delay;
        startTime = _startTime.add(_delay);
        introduce = _introduce;
    }

    function getBalance() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function getReward() public view returns (uint256) {
        // Has ended or not started
        if (cycle >= CYCLE_TIMES || block.timestamp <= startTime) {
            return 0;
        }
        uint256 pCycle = (block.timestamp.sub(startTime)).div(PERIOD);
        if (pCycle >= CYCLE_TIMES) {
            return token.balanceOf(address(this));
        }
        return pCycle.sub(cycle).mul(fixedQuantity);
    }

    function withDraw() external {
        uint256 reward = getReward();
        require(reward > 0, 'TimeLock: no reward');
        uint256 pCycle = (block.timestamp.sub(startTime)).div(PERIOD);
        cycle = pCycle >= CYCLE_TIMES ? CYCLE_TIMES : pCycle;
        hasReward = hasReward.add(reward);
        TransferHelper.safeTransfer(address(token), beneficiary, reward);
        emit WithDraw(msg.sender, beneficiary, reward);
    }

    // Update beneficiary address by the previous beneficiary.
    function setBeneficiary(address _newBeneficiary) public {
        require(msg.sender == beneficiary, 'TimeLock: Not beneficiary');
        beneficiary = _newBeneficiary;
    }
}

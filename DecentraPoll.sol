// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PollDApp {
    struct Poll {
        uint256 id;
        address creator;
        string question;
        string[] options;
        uint256[] voteCounts;
        uint256 totalVotes;
        bool active;
        uint256 createdAt;
    }

    uint256 private pollIdCounter;
    mapping(uint256 => Poll) public polls;
    uint256[] public allPollIds;
    mapping(address => mapping(uint256 => bool)) private hasVoted;
    mapping(address => mapping(uint256 => uint256)) private userVoteChoice;
    address public owner;
    mapping(uint256 => uint256) public pollExpiries;

    event PollCreated(uint256 indexed pollId, address indexed creator, string question);
    event VoteCast(uint256 indexed pollId, uint256 optionIndex);
    event PollClosed(uint256 indexed pollId);

    constructor() {
        owner = msg.sender;
    }

    function createPoll(string memory _question, string[] memory _options, uint256 _durationDays) public {
        require(_options.length >= 2, "Minimum 2 options");
        require(_options.length <= 10, "Maximum 10 options");
        require(_durationDays <= 30, "Max 30 days duration");

        uint256 pollId = pollIdCounter++;
        uint256[] memory voteCounts = new uint256[](_options.length);
        
        polls[pollId] = Poll({
            id: pollId,
            creator: msg.sender,
            question: _question,
            options: _options,
            voteCounts: voteCounts,
            totalVotes: 0,
            createdAt: block.timestamp,
            active: true
        });
        
        pollExpiries[pollId] = block.timestamp + (_durationDays * 1 days);
        allPollIds.push(pollId);
        emit PollCreated(pollId, msg.sender, _question);
    }

    function vote(uint256 _pollId, uint256 _optionIndex) public {
        Poll storage poll = polls[_pollId];
        require(poll.active, "Poll not active");
        require(_optionIndex < poll.options.length, "Invalid option");
        require(!hasVoted[msg.sender][_pollId], "Already voted");
        require(block.timestamp < pollExpiries[_pollId], "Poll expired");

        poll.voteCounts[_optionIndex]++;
        poll.totalVotes++;
        hasVoted[msg.sender][_pollId] = true;
        userVoteChoice[msg.sender][_pollId] = _optionIndex;
        emit VoteCast(_pollId, _optionIndex);
    }

    function deactivatePoll(uint256 _pollId) public {
        require(msg.sender == owner, "Only owner");
        Poll storage poll = polls[_pollId];
        poll.active = false;
        emit PollClosed(_pollId);
    }

    function getUserVote(uint256 _pollId, address _user) public view returns (uint256) {
        return userVoteChoice[_user][_pollId];
    }

    function resetAllPolls() public {
        require(msg.sender == owner, "Only owner");
        for (uint256 i = 0; i < allPollIds.length; i++) {
            uint256 pollId = allPollIds[i];
            polls[pollId].active = false;
        }
        delete allPollIds;
        pollIdCounter = 0;
    }

    function getLeaderboard() public view returns (uint256[] memory) {
        uint256[] memory pollIds = new uint256[](allPollIds.length);
        for (uint256 i = 0; i < allPollIds.length; i++) {
            pollIds[i] = allPollIds[i];
        }
        
        for (uint256 i = 0; i < pollIds.length; i++) {
            for (uint256 j = 0; j < pollIds.length - i - 1; j++) {
                if (polls[pollIds[j]].totalVotes < polls[pollIds[j + 1]].totalVotes) {
                    uint256 temp = pollIds[j];
                    pollIds[j] = pollIds[j + 1];
                    pollIds[j + 1] = temp;
                }
            }
        }
        return pollIds;
    }
}

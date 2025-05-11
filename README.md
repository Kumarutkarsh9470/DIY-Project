# DIY-Project
# DECENTRAPOLL - Enhanced DApp

## Overview
A decentralized polling application built with React and Solidity, now enhanced with new features for improved functionality and user experience.

## Features Added

### Smart Contract Enhancements
1. **Vote Tracking**  
   - Stores which option each user voted for using `userVoteChoice` mapping
   - Added `getUserVote` function to retrieve a user's vote choice
   - Updated `vote` function to track selected options

2. **Poll Management**  
   - Added `deactivatePoll` function (owner-only) to disable specific polls
   - Implemented `PollClosed` event emission when polls are deactivated
   - Enforced owner restrictions for critical functions (`resetAllPolls`)

### Frontend Enhancements
1. **Poll Filtering System**  
   - Added filter buttons: "All", "Your Polls", "Active Polls"
   - Integrated dynamic filtering logic based on:
     - Poll ownership (matches connected wallet)
     - Active status (non-expired polls)
     - Search keyword matching

2. **Vote Feedback & UI**  
   - Display users' selected votes with "✔️ Voted for [Option]" messages
   - Added "Created by you" tags for user-generated polls
   - Enhanced progress bars for vote percentage visualization

## Technical Changes

### Smart Contract (`DecentralPoll.sol`)
```solidity
// Key additions:
mapping(address => mapping(uint256 => uint256)) private userVoteChoice;
event PollClosed(uint256 indexed pollId);

function deactivatePoll(uint256 _pollId) public {
  require(msg.sender == owner, "Only owner");
  polls[_pollId].active = false;
  emit PollClosed(_pollId);
}

function getUserVote(uint256 _pollId, address _user) public view returns (uint256) {
  return userVoteChoice[_user][_pollId];
}

```javascript
// Added filter state
const [filter, setFilter] = useState('all');

// Modified poll data structure
const pollData = await pollContract.getPoll(i);
const userVote = hasVoted ? await pollContract.getUserVote(i, account) : null;
pollData.push({
  ...poll,
  userVote: userVote ? userVote.toNumber() : null,
  expiry: expiry.toNumber(),
});

// Filter logic
const filteredPolls = polls.filter(poll => {
  const matchesSearch = poll.question.toLowerCase().includes(searchQuery.toLowerCase());
  const currentTime = Math.floor(Date.now() / 1000);
  const isExpired = currentTime >= poll.expiry;
  
  if (filter === 'yours') matchesFilter = poll.creator.toLowerCase() === account?.toLowerCase();
  if (filter === 'active') matchesFilter = poll.active && !isExpired;
  
  return matchesSearch && matchesFilter;
});

// Filter UI
<div className="search-filter">
  <input
    type="text"
    placeholder="Search polls..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />
  <div className="filters">
    <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
    <button className={filter === 'yours' ? 'active' : ''} onClick={() => setFilter('yours')}>Your Polls</button>
    <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>Active</button>
  </div>
</div>

// Vote display
{poll.hasVoted && (
  <p className="voted-message">✔️ Voted for {poll.options[poll.userVote]}</p>
)}

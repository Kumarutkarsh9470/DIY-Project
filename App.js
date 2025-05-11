import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import PollDAppABI from './PollDAppABI.json';

const CONTRACT_ADDRESS = "0x3B16D40b779eBed2e4bdaD80A0F9bC0E930833C5";

function App() {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [polls, setPolls] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState(['', '']);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [filter, setFilter] = useState('all');

  // Wallet connection
  async function connectWallet() {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      setAccount(account);

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const pollContract = new ethers.Contract(CONTRACT_ADDRESS, PollDAppABI, signer);
      
      setContract(pollContract);
      await loadPolls(pollContract);
      await loadLeaderboard(pollContract);
      
      setFeedback({ type: 'success', message: 'Wallet connected!' });
      setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to connect wallet' });
      console.error("Wallet connection error:", error);
    }
    setLoading(false);
  }

  // Load polls with voting status
  const loadPolls = async (pollContract) => {
    try {
      const count = await pollContract.getPollCount();
      const pollData = [];
  
      for (let i = 0; i < count; i++) {
        try {
          const poll = await pollContract.getPoll(i);
          if (!poll.question || poll.creator === ethers.constants.AddressZero) continue;

          const hasVoted = await pollContract.hasVoted(i, account);
          const userVote = hasVoted ? await pollContract.getUserVote(i, account) : null;
          const expiry = await pollContract.pollExpiries(i);
          
          pollData.push({
            id: i,
            question: poll.question,
            options: poll.options,
            voteCounts: poll.voteCounts.map(v => v.toNumber()),
            totalVotes: poll.totalVotes.toNumber(),
            creator: poll.creator,
            hasVoted,
            userVote: userVote ? userVote.toNumber() : null,
            active: poll.active,
            expiry: expiry.toNumber(),
          });
        } catch (err) {
          console.warn(`Skipping poll ${i}: ${err.message}`);
        }
      }
      setPolls(pollData);
    } catch (err) {
      console.error("Error loading polls:", err);
    }
  };

  // Load leaderboard
  const loadLeaderboard = async (pollContract) => {
    try {
      const leaderboardIds = await pollContract.getLeaderboard();
      const leaderboardData = [];
      
      for (const pollId of leaderboardIds) {
        const poll = await pollContract.getPoll(pollId);
        leaderboardData.push({
          id: pollId,
          question: poll.question,
          totalVotes: poll.totalVotes.toNumber()
        });
      }
      
      setLeaderboard(leaderboardData);
    } catch (err) {
      console.error("Error loading leaderboard:", err);
    }
  };

  // Create new poll
  async function createPoll(e) {
    e.preventDefault();
    try {
      const options = newPollOptions.filter(option => option.trim() !== '');
      if (options.length < 2) {
        setFeedback({ type: 'error', message: 'Minimum 2 options required' });
        return;
      }

      setLoading(true);
      const tx = await contract.createPoll(newPollQuestion, options, 7); // 7-day expiry
      await tx.wait();

      setNewPollQuestion('');
      setNewPollOptions(['', '']);
      await loadPolls(contract);
      await loadLeaderboard(contract);
      
      setFeedback({ type: 'success', message: 'Poll created!' });
      setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to create poll' });
      console.error("Poll creation error:", error);
    }
    setLoading(false);
  }

  // Vote function
  async function vote(pollId, optionIndex) {
    try {
      setLoading(true);
      const tx = await contract.vote(pollId, optionIndex);
      await tx.wait();
      
      await loadPolls(contract);
      await loadLeaderboard(contract);
      setFeedback({ type: 'success', message: 'Vote recorded!' });
      setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
    } catch (error) {
      const msg = error.message.includes("already voted") 
        ? "You already voted!" 
        : "Voting failed";
      setFeedback({ type: 'error', message: msg });
    }
    setLoading(false);
  }

  // Option management
  const addOption = () => {
    setNewPollOptions([...newPollOptions, '']);
  };

  const removeOption = (index) => {
    if (newPollOptions.length <= 2) return;
    const updated = [...newPollOptions];
    updated.splice(index, 1);
    setNewPollOptions(updated);
  };

  const updateOption = (index, value) => {
    const updated = [...newPollOptions];
    updated[index] = value;
    setNewPollOptions(updated);
  };

  // Filter logic
  const filteredPolls = polls.filter(poll => {
    const matchesSearch = poll.question.toLowerCase().includes(searchQuery.toLowerCase());
    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = currentTime >= poll.expiry;
    let matchesFilter = true;

    if (filter === 'yours') {
      matchesFilter = poll.creator.toLowerCase() === account?.toLowerCase();
    } else if (filter === 'active') {
      matchesFilter = poll.active && !isExpired;
    }

    return matchesSearch && matchesFilter;
  });

  // Initialization
  useEffect(() => {
    if (!window.ethereum) {
      setFeedback({ type: 'error', message: 'Install MetaMask' });
      setLoading(false);
      return;
    }

    const initialize = async () => {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress().catch(() => null);

      if (userAddress) {
        setAccount(userAddress);
        const pollContract = new ethers.Contract(CONTRACT_ADDRESS, PollDAppABI, signer);
        setContract(pollContract);
        await loadPolls(pollContract);
        await loadLeaderboard(pollContract);
      }
      setLoading(false);
    };

    initialize();
    window.ethereum.on('accountsChanged', async (accounts) => {
      setAccount(accounts[0]);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const pollContract = new ethers.Contract(CONTRACT_ADDRESS, PollDAppABI, signer);
      await loadPolls(pollContract);
      await loadLeaderboard(pollContract);
    });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>DeFi Poll DApp</h1>
        <p>Create and participate in polls on the blockchain</p>
        {account ? (
          <p>Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
        ) : (
          <button onClick={connectWallet} disabled={loading}>
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
      </header>

      {feedback.message && (
        <div className={`feedback ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      <main>
        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
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

            <section className="create-poll">
              <h2>Create New Poll</h2>
              <form onSubmit={createPoll}>
                <div className="form-group">
                  <label>Question:</label>
                  <input
                    type="text"
                    value={newPollQuestion}
                    onChange={(e) => setNewPollQuestion(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Options:</label>
                  {newPollOptions.map((option, index) => (
                    <div key={index} className="option-row">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => removeOption(index)}
                        disabled={newPollOptions.length <= 2}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addOption}>
                    Add Option
                  </button>
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Poll'}
                </button>
              </form>
            </section>

            <section className="polls">
              <h2>All Polls ({filteredPolls.length})</h2>
              {filteredPolls.length === 0 ? (
                <p>No matching polls found</p>
              ) : (
                <div className="polls-grid">
                  {filteredPolls.map(poll => (
                    <div key={poll.id} className="poll-card">
                      <h3>{poll.question}</h3>
                      <div className="poll-meta">
                        <p>By: {poll.creator.slice(0, 6)}...{poll.creator.slice(-4)}</p>
                        {poll.creator.toLowerCase() === account?.toLowerCase() && 
                          <span className="your-poll-tag">Created by you</span>}
                      </div>
                      <div className="options">
                        {poll.options.map((option, idx) => (
                          <div key={idx} className="option">
                            <div className="option-info">
                              <span>{option}</span>
                              <span>{poll.voteCounts[idx]} votes</span>
                            </div>
                            <div className="progress-bar">
                              <div
                                className="progress"
                                style={{ width: `${(poll.voteCounts[idx] / (poll.totalVotes || 1)) * 100}%` }}
                              ></div>
                            </div>
                            {!poll.hasVoted ? (
                              <button 
                                onClick={() => vote(poll.id, idx)}
                                disabled={loading}
                              >
                                Vote
                              </button>
                            ) : (
                              <p className="voted-message">✔️ Voted for {poll.options[poll.userVote]}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="leaderboard">
              <h2>Leaderboard</h2>
              {leaderboard.length === 0 ? (
                <p>No leaderboard data</p>
              ) : (
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Poll</th>
                      <th>Votes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((poll, idx) => (
                      <tr key={poll.id}>
                        <td>{idx + 1}</td>
                        <td>{poll.question}</td>
                        <td>{poll.totalVotes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </main>

      <footer>
        <p>DeFi Poll DApp - Now with advanced filters and vote tracking</p>
      </footer>
    </div>
  );
}

export default App;

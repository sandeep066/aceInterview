import { Question, InterviewStyle, ExperienceLevel } from '../types';

export const questionBank: Record<InterviewStyle, Record<ExperienceLevel, Question[]>> = {
  technical: {
    fresher: [
      {
        id: 'tech-fresher-1',
        text: 'What is the difference between let, const, and var in JavaScript?',
        followUp: ['Can you give me an example of when you would use each one?'],
        category: 'JavaScript Fundamentals',
        difficulty: 'easy'
      },
      {
        id: 'tech-fresher-2',
        text: 'Explain what HTML semantic elements are and why they are important.',
        followUp: ['Can you name a few semantic elements and their purposes?'],
        category: 'HTML/CSS',
        difficulty: 'easy'
      },
      {
        id: 'tech-fresher-3',
        text: 'What is the difference between == and === in JavaScript?',
        followUp: ['Can you provide examples where this difference matters?'],
        category: 'JavaScript Fundamentals',
        difficulty: 'medium'
      }
    ],
    junior: [
      {
        id: 'tech-junior-1',
        text: 'Explain the concept of closures in JavaScript with an example.',
        followUp: ['How would you use closures to create a private variable?'],
        category: 'JavaScript Advanced',
        difficulty: 'medium'
      },
      {
        id: 'tech-junior-2',
        text: 'What is the difference between synchronous and asynchronous programming?',
        followUp: ['How do you handle asynchronous operations in JavaScript?'],
        category: 'Async Programming',
        difficulty: 'medium'
      },
      {
        id: 'tech-junior-3',
        text: 'Explain the CSS Box Model and how margin collapsing works.',
        followUp: ['How would you prevent margin collapsing?'],
        category: 'CSS',
        difficulty: 'medium'
      }
    ],
    'mid-level': [
      {
        id: 'tech-mid-1',
        text: 'Design a simple caching system. What considerations would you make?',
        followUp: ['How would you handle cache invalidation?', 'What about cache size limits?'],
        category: 'System Design',
        difficulty: 'hard'
      },
      {
        id: 'tech-mid-2',
        text: 'Explain the virtual DOM and how React uses it for performance optimization.',
        followUp: ['What are the benefits and potential drawbacks?'],
        category: 'React',
        difficulty: 'medium'
      },
      {
        id: 'tech-mid-3',
        text: 'How would you optimize the performance of a web application?',
        followUp: ['What tools would you use to identify performance bottlenecks?'],
        category: 'Performance',
        difficulty: 'hard'
      }
    ],
    senior: [
      {
        id: 'tech-senior-1',
        text: 'Design a scalable architecture for a real-time chat application.',
        followUp: ['How would you handle millions of concurrent users?', 'What database would you choose and why?'],
        category: 'System Design',
        difficulty: 'hard'
      },
      {
        id: 'tech-senior-2',
        text: 'Explain different software architectural patterns and when you would use each.',
        followUp: ['How do you decide between microservices and monolithic architecture?'],
        category: 'Architecture',
        difficulty: 'hard'
      },
      {
        id: 'tech-senior-3',
        text: 'How do you approach technical debt in a codebase?',
        followUp: ['How do you balance feature development with technical debt reduction?'],
        category: 'Technical Leadership',
        difficulty: 'hard'
      }
    ],
    'lead-manager': [
      {
        id: 'tech-lead-1',
        text: 'How do you establish and maintain coding standards across a large development team?',
        followUp: ['How do you handle resistance to new standards?'],
        category: 'Team Leadership',
        difficulty: 'hard'
      },
      {
        id: 'tech-lead-2',
        text: 'Describe your approach to technology stack decisions for new projects.',
        followUp: ['How do you balance innovation with stability?'],
        category: 'Technical Strategy',
        difficulty: 'hard'
      },
      {
        id: 'tech-lead-3',
        text: 'How do you mentor junior developers and help them grow?',
        followUp: ['How do you measure the success of your mentoring?'],
        category: 'Team Development',
        difficulty: 'hard'
      }
    ]
  },
  hr: {
    fresher: [
      {
        id: 'hr-fresher-1',
        text: 'Tell me about yourself and why you are interested in this role.',
        followUp: ['What specific skills do you hope to develop in this position?'],
        category: 'Introduction',
        difficulty: 'easy'
      },
      {
        id: 'hr-fresher-2',
        text: 'Why did you choose this field/technology?',
        followUp: ['What excites you most about working in this industry?'],
        category: 'Motivation',
        difficulty: 'easy'
      },
      {
        id: 'hr-fresher-3',
        text: 'How do you handle learning new technologies or skills?',
        followUp: ['Can you give me an example of a recent skill you learned?'],
        category: 'Learning',
        difficulty: 'easy'
      }
    ],
    junior: [
      {
        id: 'hr-junior-1',
        text: 'Describe a challenging project you worked on and how you overcame obstacles.',
        followUp: ['What would you do differently if you faced a similar situation again?'],
        category: 'Problem Solving',
        difficulty: 'medium'
      },
      {
        id: 'hr-junior-2',
        text: 'How do you prioritize your work when you have multiple deadlines?',
        followUp: ['Can you give me a specific example?'],
        category: 'Time Management',
        difficulty: 'medium'
      },
      {
        id: 'hr-junior-3',
        text: 'Tell me about a time you had to work with a difficult team member.',
        followUp: ['How did you handle the situation?'],
        category: 'Teamwork',
        difficulty: 'medium'
      }
    ],
    'mid-level': [
      {
        id: 'hr-mid-1',
        text: 'Describe a time when you had to make a difficult decision with limited information.',
        followUp: ['How did you gather the information you needed?', 'What was the outcome?'],
        category: 'Decision Making',
        difficulty: 'medium'
      },
      {
        id: 'hr-mid-2',
        text: 'How do you handle feedback, both giving and receiving it?',
        followUp: ['Can you share an example of difficult feedback you had to give?'],
        category: 'Communication',
        difficulty: 'medium'
      },
      {
        id: 'hr-mid-3',
        text: 'Tell me about a time you had to adapt to a significant change at work.',
        followUp: ['How did you help your team through the transition?'],
        category: 'Adaptability',
        difficulty: 'medium'
      }
    ],
    senior: [
      {
        id: 'hr-senior-1',
        text: 'Describe your leadership style and how you motivate your team.',
        followUp: ['How do you handle underperforming team members?'],
        category: 'Leadership',
        difficulty: 'hard'
      },
      {
        id: 'hr-senior-2',
        text: 'Tell me about a time you had to influence stakeholders without direct authority.',
        followUp: ['What strategies did you use?', 'What was the result?'],
        category: 'Influence',
        difficulty: 'hard'
      },
      {
        id: 'hr-senior-3',
        text: 'How do you approach building and maintaining relationships across different departments?',
        followUp: ['Can you share a specific example of cross-functional collaboration?'],
        category: 'Collaboration',
        difficulty: 'hard'
      }
    ],
    'lead-manager': [
      {
        id: 'hr-lead-1',
        text: 'How do you develop and communicate your vision for the team/organization?',
        followUp: ['How do you ensure buy-in from stakeholders?'],
        category: 'Vision & Strategy',
        difficulty: 'hard'
      },
      {
        id: 'hr-lead-2',
        text: 'Describe your approach to conflict resolution between team members.',
        followUp: ['How do you prevent conflicts from escalating?'],
        category: 'Conflict Management',
        difficulty: 'hard'
      },
      {
        id: 'hr-lead-3',
        text: 'How do you balance the needs of your team with organizational demands?',
        followUp: ['Can you share an example of a difficult balance you had to strike?'],
        category: 'Strategic Leadership',
        difficulty: 'hard'
      }
    ]
  },
  behavioral: {
    fresher: [
      {
        id: 'behavioral-fresher-1',
        text: 'Tell me about a time you faced a significant challenge in your studies or projects.',
        followUp: ['How did you approach solving it?', 'What did you learn from the experience?'],
        category: 'Problem Solving',
        difficulty: 'easy'
      },
      {
        id: 'behavioral-fresher-2',
        text: 'Describe a situation where you had to work in a team with different personalities.',
        followUp: ['How did you ensure effective collaboration?'],
        category: 'Teamwork',
        difficulty: 'easy'
      },
      {
        id: 'behavioral-fresher-3',
        text: 'Tell me about a time you had to learn something completely new quickly.',
        followUp: ['What strategies did you use?', 'How did you measure your progress?'],
        category: 'Learning Agility',
        difficulty: 'easy'
      }
    ],
    junior: [
      {
        id: 'behavioral-junior-1',
        text: 'Describe a time when you disagreed with your supervisor or team lead.',
        followUp: ['How did you handle the situation?', 'What was the outcome?'],
        category: 'Conflict Resolution',
        difficulty: 'medium'
      },
      {
        id: 'behavioral-junior-2',
        text: 'Tell me about a project where you exceeded expectations.',
        followUp: ['What specific actions did you take?', 'How did you measure success?'],
        category: 'Achievement',
        difficulty: 'medium'
      },
      {
        id: 'behavioral-junior-3',
        text: 'Describe a time when you made a mistake and how you handled it.',
        followUp: ['What did you learn?', 'How do you prevent similar mistakes now?'],
        category: 'Accountability',
        difficulty: 'medium'
      }
    ],
    'mid-level': [
      {
        id: 'behavioral-mid-1',
        text: 'Tell me about a time you had to persuade someone to change their mind.',
        followUp: ['What approach did you take?', 'How did you handle resistance?'],
        category: 'Influence',
        difficulty: 'medium'
      },
      {
        id: 'behavioral-mid-2',
        text: 'Describe a situation where you had to take initiative without being asked.',
        followUp: ['What was the impact?', 'How did you communicate your actions to stakeholders?'],
        category: 'Initiative',
        difficulty: 'medium'
      },
      {
        id: 'behavioral-mid-3',
        text: 'Tell me about a time you had to work under significant pressure or tight deadlines.',
        followUp: ['How did you manage your stress?', 'What was the outcome?'],
        category: 'Pressure Management',
        difficulty: 'hard'
      }
    ],
    senior: [
      {
        id: 'behavioral-senior-1',
        text: 'Describe a time you had to make an unpopular decision.',
        followUp: ['How did you communicate it?', 'How did you handle the backlash?'],
        category: 'Difficult Decisions',
        difficulty: 'hard'
      },
      {
        id: 'behavioral-senior-2',
        text: 'Tell me about a time you failed to meet an important goal or deadline.',
        followUp: ['How did you handle the situation?', 'What did you learn?'],
        category: 'Failure Management',
        difficulty: 'hard'
      },
      {
        id: 'behavioral-senior-3',
        text: 'Describe a situation where you had to coach or develop someone.',
        followUp: ['What approach did you take?', 'What was the result?'],
        category: 'Development',
        difficulty: 'hard'
      }
    ],
    'lead-manager': [
      {
        id: 'behavioral-lead-1',
        text: 'Tell me about a time you had to lead your team through a major organizational change.',
        followUp: ['How did you maintain morale?', 'What challenges did you face?'],
        category: 'Change Leadership',
        difficulty: 'hard'
      },
      {
        id: 'behavioral-lead-2',
        text: 'Describe a situation where you had to balance competing priorities from different stakeholders.',
        followUp: ['How did you make the decision?', 'How did you communicate it?'],
        category: 'Stakeholder Management',
        difficulty: 'hard'
      },
      {
        id: 'behavioral-lead-3',
        text: 'Tell me about a time you had to rebuild trust after a significant setback.',
        followUp: ['What specific actions did you take?', 'How long did it take?'],
        category: 'Trust Building',
        difficulty: 'hard'
      }
    ]
  },
  'salary-negotiation': {
    fresher: [
      {
        id: 'salary-fresher-1',
        text: 'What are your salary expectations for this role?',
        followUp: ['How did you arrive at this figure?'],
        category: 'Compensation',
        difficulty: 'easy'
      },
      {
        id: 'salary-fresher-2',
        text: 'Besides salary, what other benefits are important to you?',
        followUp: ['How do you prioritize these benefits?'],
        category: 'Benefits',
        difficulty: 'easy'
      },
      {
        id: 'salary-fresher-3',
        text: 'How flexible are you with your salary expectations?',
        followUp: ['What factors would make you consider a lower offer?'],
        category: 'Flexibility',
        difficulty: 'medium'
      }
    ],
    junior: [
      {
        id: 'salary-junior-1',
        text: 'Based on your experience and skills, justify your salary expectation.',
        followUp: ['How does this compare to your current compensation?'],
        category: 'Justification',
        difficulty: 'medium'
      },
      {
        id: 'salary-junior-2',
        text: 'What would you do if our budget for this role is lower than your expectations?',
        followUp: ['Are there other forms of compensation you would consider?'],
        category: 'Negotiation',
        difficulty: 'medium'
      },
      {
        id: 'salary-junior-3',
        text: 'How do you research salary ranges for positions?',
        followUp: ['What sources do you trust most?'],
        category: 'Market Research',
        difficulty: 'medium'
      }
    ],
    'mid-level': [
      {
        id: 'salary-mid-1',
        text: 'What value do you bring that justifies a premium over other candidates?',
        followUp: ['Can you quantify the impact you have made in previous roles?'],
        category: 'Value Proposition',
        difficulty: 'medium'
      },
      {
        id: 'salary-mid-2',
        text: 'How do you approach total compensation versus base salary?',
        followUp: ['What mix works best for your situation?'],
        category: 'Total Compensation',
        difficulty: 'medium'
      },
      {
        id: 'salary-mid-3',
        text: 'What are your long-term compensation growth expectations?',
        followUp: ['How do you see your value increasing over time?'],
        category: 'Growth Expectations',
        difficulty: 'hard'
      }
    ],
    senior: [
      {
        id: 'salary-senior-1',
        text: 'How do you evaluate equity compensation versus cash compensation?',
        followUp: ['What factors do you consider when assessing equity offers?'],
        category: 'Equity Evaluation',
        difficulty: 'hard'
      },
      {
        id: 'salary-senior-2',
        text: 'What would make you accept an offer that is below your initial expectations?',
        followUp: ['How do you weigh compensation against other factors?'],
        category: 'Trade-offs',
        difficulty: 'hard'
      },
      {
        id: 'salary-senior-3',
        text: 'How do you negotiate when you have multiple offers?',
        followUp: ['What is your approach to leveraging competing offers?'],
        category: 'Multiple Offers',
        difficulty: 'hard'
      }
    ],
    'lead-manager': [
      {
        id: 'salary-lead-1',
        text: 'How do you structure compensation discussions for executive-level roles?',
        followUp: ['What components are most important at this level?'],
        category: 'Executive Compensation',
        difficulty: 'hard'
      },
      {
        id: 'salary-lead-2',
        text: 'How do you approach performance-based compensation structures?',
        followUp: ['What metrics do you think should drive variable compensation?'],
        category: 'Performance Pay',
        difficulty: 'hard'
      },
      {
        id: 'salary-lead-3',
        text: 'What is your philosophy on compensation transparency and equity?',
        followUp: ['How do you ensure fair compensation across your team?'],
        category: 'Compensation Philosophy',
        difficulty: 'hard'
      }
    ]
  },
  'case-study': {
    fresher: [
      {
        id: 'case-fresher-1',
        text: 'A user reports that a web page is loading slowly. Walk me through how you would investigate this issue.',
        followUp: ['What tools would you use?', 'How would you prioritize potential causes?'],
        category: 'Problem Solving',
        difficulty: 'medium'
      },
      {
        id: 'case-fresher-2',
        text: 'You need to choose between two similar JavaScript libraries for a project. How would you make this decision?',
        followUp: ['What criteria would you use?', 'How would you present your recommendation?'],
        category: 'Decision Making',
        difficulty: 'medium'
      },
      {
        id: 'case-fresher-3',
        text: 'A client wants to add a new feature that conflicts with the existing design. How would you handle this?',
        followUp: ['How would you communicate the trade-offs?'],
        category: 'Client Management',
        difficulty: 'medium'
      }
    ],
    junior: [
      {
        id: 'case-junior-1',
        text: 'Design a simple booking system for a restaurant. What are the key components and considerations?',
        followUp: ['How would you handle conflicts in reservations?', 'What about different table sizes?'],
        category: 'System Design',
        difficulty: 'medium'
      },
      {
        id: 'case-junior-2',
        text: 'Your team is consistently missing sprint deadlines. How would you analyze and address this problem?',
        followUp: ['What data would you collect?', 'How would you present solutions to management?'],
        category: 'Process Improvement',
        difficulty: 'medium'
      },
      {
        id: 'case-junior-3',
        text: 'A legacy system needs to be modernized. How would you approach planning this migration?',
        followUp: ['How would you minimize downtime?', 'What risks would you identify?'],
        category: 'Migration Planning',
        difficulty: 'hard'
      }
    ],
    'mid-level': [
      {
        id: 'case-mid-1',
        text: 'Design a monitoring system for a microservices architecture. What would you monitor and why?',
        followUp: ['How would you handle alerting?', 'What about distributed tracing?'],
        category: 'System Design',
        difficulty: 'hard'
      },
      {
        id: 'case-mid-2',
        text: 'A competitor just launched a feature similar to yours but with better performance. How would you respond?',
        followUp: ['How would you prioritize improvements?', 'What would your timeline look like?'],
        category: 'Competitive Response',
        difficulty: 'hard'
      },
      {
        id: 'case-mid-3',
        text: 'Your application needs to handle a 10x increase in traffic. How would you prepare?',
        followUp: ['What would you optimize first?', 'How would you test your improvements?'],
        category: 'Scaling',
        difficulty: 'hard'
      }
    ],
    senior: [
      {
        id: 'case-senior-1',
        text: 'Design the architecture for a global content delivery system. Consider latency, reliability, and cost.',
        followUp: ['How would you handle data consistency?', 'What about regional compliance requirements?'],
        category: 'Architecture Design',
        difficulty: 'hard'
      },
      {
        id: 'case-senior-2',
        text: 'Your company wants to adopt a new technology stack. How would you evaluate and plan this transition?',
        followUp: ['How would you manage risk?', 'What about team training?'],
        category: 'Technology Strategy',
        difficulty: 'hard'
      },
      {
        id: 'case-senior-3',
        text: 'A critical security vulnerability was discovered in your production system. Walk me through your response.',
        followUp: ['How would you communicate with stakeholders?', 'What about preventing future incidents?'],
        category: 'Crisis Management',
        difficulty: 'hard'
      }
    ],
    'lead-manager': [
      {
        id: 'case-lead-1',
        text: 'Your engineering organization needs to scale from 50 to 200 developers. How would you structure this growth?',
        followUp: ['How would you maintain culture?', 'What about maintaining code quality?'],
        category: 'Organizational Scaling',
        difficulty: 'hard'
      },
      {
        id: 'case-lead-2',
        text: 'Two of your key teams are in conflict over shared resources and priorities. How would you resolve this?',
        followUp: ['How would you prevent similar conflicts in the future?'],
        category: 'Conflict Resolution',
        difficulty: 'hard'
      },
      {
        id: 'case-lead-3',
        text: 'The business wants to cut engineering costs by 30% while maintaining delivery velocity. How would you approach this?',
        followUp: ['What trade-offs would you present?', 'How would you measure success?'],
        category: 'Resource Management',
        difficulty: 'hard'
      }
    ]
  }
};
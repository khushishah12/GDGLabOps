/**
 * GDG LabOps - Trusted Workshop Tool Catalogue & Environment Profiles
 *
 * Defines the three initial workshop categories and their underlying cloud container profiles:
 * 1. Cybersecurity (CYBERSECURITY_LAB)
 * 2. Data Science (DATA_SCIENCE_LAB)
 * 3. Linux (LINUX_LAB)
 *
 * Organisers can add or remove approved tools per workshop through the Workshop Tool Manager
 * without manually writing Dockerfiles or modifying source code.
 */

export const APPROVED_WORKSHOP_CATEGORIES = [
  'Cybersecurity',
  'Data Science',
  'Linux',
] as const;

export type ApprovedWorkshopCategory = typeof APPROVED_WORKSHOP_CATEGORIES[number];

export type EnvironmentProfileId = 'CYBERSECURITY_LAB' | 'DATA_SCIENCE_LAB' | 'LINUX_LAB';

export interface ApprovedTool {
  id: string;
  name: string;
  category: ApprovedWorkshopCategory;
  description: string;
  version: string;
  supportedProfiles: EnvironmentProfileId[];
  isMandatory: boolean;       // Cannot be removed (core OS / shell integrity)
  isDefault: boolean;         // Included in base profile by default
  requiresDesktop: boolean;   // Requires remote desktop / X11 / noVNC web GUI
  installationMethod: 'preinstalled' | 'apt' | 'pip' | 'binary';
  package: string;
  verificationCommand: string;
  dependencies: string[];
}

export interface EnvironmentProfileDefinition {
  id: EnvironmentProfileId;
  name: string;
  category: ApprovedWorkshopCategory;
  baseImage: string;
  runnerProfile: string;
  defaultAccessMethod: 'terminal' | 'desktop';
  desktopAccessSupported: boolean;
  description: string;
  defaultToolIds: string[];
  mandatoryToolIds: string[];
  resourceLimits: {
    nanoCpus: number;
    memoryMb: number;
    pidsLimit: number;
    storageMb: number;
  };
  targetEnvironmentNotice?: string;
  powerBiNotice?: string;
}

export const ENVIRONMENT_PROFILES: Record<EnvironmentProfileId, EnvironmentProfileDefinition> = {
  CYBERSECURITY_LAB: {
    id: 'CYBERSECURITY_LAB',
    name: 'Cybersecurity Laboratory',
    category: 'Cybersecurity',
    baseImage: 'kali-rolling',
    runnerProfile: 'kali-cybersecurity',
    defaultAccessMethod: 'terminal',
    desktopAccessSupported: true,
    description: 'Offensive and defensive security lab running Kali Linux with preinstalled penetration testing utilities.',
    defaultToolIds: ['kali-linux', 'metasploit', 'nmap', 'netcat'],
    mandatoryToolIds: ['kali-linux', 'bash'],
    resourceLimits: {
      nanoCpus: 1_500_000_000,
      memoryMb: 2048,
      pidsLimit: 128,
      storageMb: 2048,
    },
    targetEnvironmentNotice: 'Isolated Metasploitable 2 Target attached via internal network bridge (10.0.5.20). Not exposed to public internet.',
  },

  DATA_SCIENCE_LAB: {
    id: 'DATA_SCIENCE_LAB',
    name: 'Data Science & Machine Learning Workspace',
    category: 'Data Science',
    baseImage: 'python:3.11-slim',
    runnerProfile: 'python-datascience',
    defaultAccessMethod: 'terminal',
    desktopAccessSupported: false,
    description: 'Interactive analytics environment with Python 3.11, JupyterLab, scientific libraries, and MySQL Server.',
    defaultToolIds: [
      'python',
      'jupyterlab',
      'numpy',
      'pandas',
      'matplotlib',
      'seaborn',
      'scikit-learn',
      'mysql-server',
      'mysql-client',
    ],
    mandatoryToolIds: ['python', 'bash'],
    resourceLimits: {
      nanoCpus: 2_000_000_000,
      memoryMb: 2048,
      pidsLimit: 128,
      storageMb: 2048,
    },
    powerBiNotice: 'Power BI Desktop requires Windows. Linux environments access Power BI Service (app.powerbi.com) through browser.',
  },

  LINUX_LAB: {
    id: 'LINUX_LAB',
    name: 'Linux Administration & Shell Lab',
    category: 'Linux',
    baseImage: 'ubuntu:22.04',
    runnerProfile: 'ubuntu-fundamentals',
    defaultAccessMethod: 'terminal',
    desktopAccessSupported: false,
    description: 'POSIX shell sandbox for system administration, permissions, shell scripting, Git, and compiling.',
    defaultToolIds: ['ubuntu-linux', 'bash', 'git', 'gcc', 'python', 'vim', 'nano', 'net-tools', 'curl'],
    mandatoryToolIds: ['ubuntu-linux', 'bash'],
    resourceLimits: {
      nanoCpus: 1_000_000_000,
      memoryMb: 1024,
      pidsLimit: 96,
      storageMb: 1024,
    },
  },
};

/**
 * Approved Tool Catalogue by category
 */
export const TOOL_CATALOGUE: Record<string, ApprovedTool> = {
  // ----------------------------------------------------
  // CYBERSECURITY TOOLS
  // ----------------------------------------------------
  'kali-linux': {
    id: 'kali-linux',
    name: 'Kali Linux Core OS',
    category: 'Cybersecurity',
    description: 'Debian-derived Linux distribution geared towards penetration testing and digital forensics.',
    version: '2024.1 Rolling',
    supportedProfiles: ['CYBERSECURITY_LAB'],
    isMandatory: true,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'preinstalled',
    package: 'kali-linux-core',
    verificationCommand: 'uname -a',
    dependencies: [],
  },
  metasploit: {
    id: 'metasploit',
    name: 'Metasploit Framework',
    category: 'Cybersecurity',
    description: 'Comprehensive penetration testing framework for discovering, exploiting, and validating vulnerabilities.',
    version: '6.3 LTS',
    supportedProfiles: ['CYBERSECURITY_LAB'],
    isMandatory: false,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'preinstalled',
    package: 'metasploit-framework',
    verificationCommand: 'msfconsole -v',
    dependencies: ['nmap'],
  },
  nmap: {
    id: 'nmap',
    name: 'Nmap Network Scanner',
    category: 'Cybersecurity',
    description: 'Network exploration tool and security / port scanner for host and service discovery.',
    version: '7.94',
    supportedProfiles: ['CYBERSECURITY_LAB', 'LINUX_LAB'],
    isMandatory: false,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'nmap',
    verificationCommand: 'nmap --version',
    dependencies: [],
  },
  burpsuite: {
    id: 'burpsuite',
    name: 'Burp Suite Community Edition',
    category: 'Cybersecurity',
    description: 'Interactive web security testing proxy, web vulnerability scanner, and HTTP request inspector.',
    version: 'Community 2024.3',
    supportedProfiles: ['CYBERSECURITY_LAB'],
    isMandatory: false,
    isDefault: false,
    requiresDesktop: true,
    installationMethod: 'apt',
    package: 'burpsuite',
    verificationCommand: 'burpsuite --version',
    dependencies: [],
  },
  'owasp-zap': {
    id: 'owasp-zap',
    name: 'OWASP ZAP',
    category: 'Cybersecurity',
    description: 'Open-source web application security scanner for testing web vulnerabilities automatically.',
    version: '2.14.0',
    supportedProfiles: ['CYBERSECURITY_LAB'],
    isMandatory: false,
    isDefault: false,
    requiresDesktop: true,
    installationMethod: 'apt',
    package: 'zaproxy',
    verificationCommand: 'zap.sh -version',
    dependencies: [],
  },
  wireshark: {
    id: 'wireshark',
    name: 'Wireshark Network Analyzer',
    category: 'Cybersecurity',
    description: 'Network protocol packet capture and packet inspection utility.',
    version: '4.2.2',
    supportedProfiles: ['CYBERSECURITY_LAB'],
    isMandatory: false,
    isDefault: false,
    requiresDesktop: true,
    installationMethod: 'apt',
    package: 'wireshark tshark',
    verificationCommand: 'tshark -v',
    dependencies: [],
  },
  sqlmap: {
    id: 'sqlmap',
    name: 'SQLmap Automatic SQLi Tool',
    category: 'Cybersecurity',
    description: 'Automated tool to detect and exploit SQL injection vulnerabilities in web applications.',
    version: '1.8.2',
    supportedProfiles: ['CYBERSECURITY_LAB'],
    isMandatory: false,
    isDefault: false,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'sqlmap',
    verificationCommand: 'sqlmap --version',
    dependencies: ['python'],
  },
  john: {
    id: 'john',
    name: 'John the Ripper',
    category: 'Cybersecurity',
    description: 'Fast password auditing and hash recovery tool supporting hundreds of cipher formats.',
    version: '1.9.0-jumbo',
    supportedProfiles: ['CYBERSECURITY_LAB'],
    isMandatory: false,
    isDefault: false,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'john',
    verificationCommand: 'john --version',
    dependencies: [],
  },
  hydra: {
    id: 'hydra',
    name: 'THC-Hydra',
    category: 'Cybersecurity',
    description: 'High-speed network login cracker supporting numerous protocols (SSH, FTP, HTTP, SMB).',
    version: '9.5',
    supportedProfiles: ['CYBERSECURITY_LAB'],
    isMandatory: false,
    isDefault: false,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'hydra',
    verificationCommand: 'hydra -h',
    dependencies: [],
  },
  gobuster: {
    id: 'gobuster',
    name: 'Gobuster Directory Scanner',
    category: 'Cybersecurity',
    description: 'URI and DNS subdomain bruteforcing utility written in Go for discovering hidden paths.',
    version: '3.6.0',
    supportedProfiles: ['CYBERSECURITY_LAB'],
    isMandatory: false,
    isDefault: false,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'gobuster',
    verificationCommand: 'gobuster version',
    dependencies: [],
  },
  nikto: {
    id: 'nikto',
    name: 'Nikto Web Scanner',
    category: 'Cybersecurity',
    description: 'Comprehensive command-line scanner for web servers, dangerous files, and outdated server software.',
    version: '2.5.0',
    supportedProfiles: ['CYBERSECURITY_LAB'],
    isMandatory: false,
    isDefault: false,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'nikto',
    verificationCommand: 'nikto -Version',
    dependencies: [],
  },
  ghidra: {
    id: 'ghidra',
    name: 'NSA Ghidra SRE',
    category: 'Cybersecurity',
    description: 'Software reverse engineering and binary analysis suite with decompiler.',
    version: '11.0.1',
    supportedProfiles: ['CYBERSECURITY_LAB'],
    isMandatory: false,
    isDefault: false,
    requiresDesktop: true,
    installationMethod: 'apt',
    package: 'ghidra',
    verificationCommand: 'ghidraRun -help',
    dependencies: [],
  },

  // ----------------------------------------------------
  // DATA SCIENCE TOOLS
  // ----------------------------------------------------
  python: {
    id: 'python',
    name: 'Python 3.11 Runtime',
    category: 'Data Science',
    description: 'Core Python interpreter with pip package manager and standard library.',
    version: '3.11.8',
    supportedProfiles: ['DATA_SCIENCE_LAB', 'LINUX_LAB', 'CYBERSECURITY_LAB'],
    isMandatory: true,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'preinstalled',
    package: 'python3 python3-pip',
    verificationCommand: 'python3 --version',
    dependencies: [],
  },
  jupyterlab: {
    id: 'jupyterlab',
    name: 'JupyterLab Interactive Notebooks',
    category: 'Data Science',
    description: 'Browser-based interactive development environment for data science notebooks, code, and visualizations.',
    version: '4.1.2',
    supportedProfiles: ['DATA_SCIENCE_LAB'],
    isMandatory: false,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'pip',
    package: 'jupyterlab',
    verificationCommand: 'jupyter lab --version',
    dependencies: ['python'],
  },
  numpy: {
    id: 'numpy',
    name: 'NumPy Array Computing',
    category: 'Data Science',
    description: 'Fundamental package for scientific computing with powerful N-dimensional array objects.',
    version: '1.26.4',
    supportedProfiles: ['DATA_SCIENCE_LAB'],
    isMandatory: false,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'pip',
    package: 'numpy',
    verificationCommand: 'python3 -c "import numpy; print(numpy.__version__)"',
    dependencies: ['python'],
  },
  pandas: {
    id: 'pandas',
    name: 'Pandas Data Analysis',
    category: 'Data Science',
    description: 'Fast, flexible, and expressive data structures for tabular and time-series data analysis.',
    version: '2.2.1',
    supportedProfiles: ['DATA_SCIENCE_LAB'],
    isMandatory: false,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'pip',
    package: 'pandas',
    verificationCommand: 'python3 -c "import pandas; print(pandas.__version__)"',
    dependencies: ['python', 'numpy'],
  },
  matplotlib: {
    id: 'matplotlib',
    name: 'Matplotlib Visualisation',
    category: 'Data Science',
    description: 'Comprehensive 2D plotting library for producing publication-quality figures.',
    version: '3.8.3',
    supportedProfiles: ['DATA_SCIENCE_LAB'],
    isMandatory: false,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'pip',
    package: 'matplotlib',
    verificationCommand: 'python3 -c "import matplotlib; print(matplotlib.__version__)"',
    dependencies: ['python', 'numpy'],
  },
  seaborn: {
    id: 'seaborn',
    name: 'Seaborn Statistical Graphics',
    category: 'Data Science',
    description: 'Statistical data visualization library based on matplotlib with attractive default themes.',
    version: '0.13.2',
    supportedProfiles: ['DATA_SCIENCE_LAB'],
    isMandatory: false,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'pip',
    package: 'seaborn',
    verificationCommand: 'python3 -c "import seaborn; print(seaborn.__version__)"',
    dependencies: ['python', 'pandas', 'matplotlib'],
  },
  'scikit-learn': {
    id: 'scikit-learn',
    name: 'Scikit-Learn Machine Learning',
    category: 'Data Science',
    description: 'Simple and efficient tools for predictive data analysis, classification, regression, and clustering.',
    version: '1.4.1',
    supportedProfiles: ['DATA_SCIENCE_LAB'],
    isMandatory: false,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'pip',
    package: 'scikit-learn',
    verificationCommand: 'python3 -c "import sklearn; print(sklearn.__version__)"',
    dependencies: ['python', 'numpy'],
  },
  tensorflow: {
    id: 'tensorflow',
    name: 'TensorFlow Deep Learning',
    category: 'Data Science',
    description: 'End-to-end open-source machine learning platform for neural network training and inference.',
    version: '2.16.1',
    supportedProfiles: ['DATA_SCIENCE_LAB'],
    isMandatory: false,
    isDefault: false,
    requiresDesktop: false,
    installationMethod: 'pip',
    package: 'tensorflow-cpu',
    verificationCommand: 'python3 -c "import tensorflow as tf; print(tf.__version__)"',
    dependencies: ['python', 'numpy'],
  },
  pytorch: {
    id: 'pytorch',
    name: 'PyTorch Deep Learning',
    category: 'Data Science',
    description: 'Optimized tensor library for deep learning using GPUs and CPUs with dynamic graph execution.',
    version: '2.2.1',
    supportedProfiles: ['DATA_SCIENCE_LAB'],
    isMandatory: false,
    isDefault: false,
    requiresDesktop: false,
    installationMethod: 'pip',
    package: 'torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu',
    verificationCommand: 'python3 -c "import torch; print(torch.__version__)"',
    dependencies: ['python'],
  },
  'mysql-server': {
    id: 'mysql-server',
    name: 'MySQL Server Database',
    category: 'Data Science',
    description: 'Relational database management engine configured with sample schemas for SQL workshops.',
    version: '8.0 LTS',
    supportedProfiles: ['DATA_SCIENCE_LAB', 'LINUX_LAB'],
    isMandatory: false,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'mysql-server',
    verificationCommand: 'mysqld --version',
    dependencies: ['mysql-client'],
  },
  'mysql-client': {
    id: 'mysql-client',
    name: 'MySQL Command-Line Client',
    category: 'Data Science',
    description: 'Interactive command-line tool for querying and managing MySQL relational databases.',
    version: '8.0 Client',
    supportedProfiles: ['DATA_SCIENCE_LAB', 'LINUX_LAB'],
    isMandatory: false,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'mysql-client',
    verificationCommand: 'mysql --version',
    dependencies: [],
  },
  'r-base': {
    id: 'r-base',
    name: 'R Programming Language',
    category: 'Data Science',
    description: 'Environment for statistical computing, data analysis, and graphical techniques.',
    version: '4.3.3',
    supportedProfiles: ['DATA_SCIENCE_LAB'],
    isMandatory: false,
    isDefault: false,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'r-base',
    verificationCommand: 'R --version',
    dependencies: [],
  },
  rstudio: {
    id: 'rstudio',
    name: 'RStudio Server Web Interface',
    category: 'Data Science',
    description: 'Integrated development environment for R accessible via browser.',
    version: '2023.12',
    supportedProfiles: ['DATA_SCIENCE_LAB'],
    isMandatory: false,
    isDefault: false,
    requiresDesktop: false,
    installationMethod: 'binary',
    package: 'rstudio-server',
    verificationCommand: 'rstudio-server version',
    dependencies: ['r-base'],
  },

  // ----------------------------------------------------
  // LINUX ADMINISTRATION & SHELL TOOLS
  // ----------------------------------------------------
  'ubuntu-linux': {
    id: 'ubuntu-linux',
    name: 'Ubuntu Linux 22.04 LTS Core',
    category: 'Linux',
    description: 'Reliable, enterprise-grade Linux distribution with GNU coreutils and package manager.',
    version: '22.04 LTS Jammy',
    supportedProfiles: ['LINUX_LAB'],
    isMandatory: true,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'preinstalled',
    package: 'ubuntu-base',
    verificationCommand: 'lsb_release -d',
    dependencies: [],
  },
  bash: {
    id: 'bash',
    name: 'GNU Bash Shell',
    category: 'Linux',
    description: 'Standard Bourne-Again Shell for command execution, automation, and scripting.',
    version: '5.1',
    supportedProfiles: ['LINUX_LAB', 'CYBERSECURITY_LAB', 'DATA_SCIENCE_LAB'],
    isMandatory: true,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'preinstalled',
    package: 'bash',
    verificationCommand: 'bash --version',
    dependencies: [],
  },
  git: {
    id: 'git',
    name: 'Git Version Control',
    category: 'Linux',
    description: 'Distributed version control system for tracking source code changes and collaborating.',
    version: '2.34.1',
    supportedProfiles: ['LINUX_LAB', 'CYBERSECURITY_LAB', 'DATA_SCIENCE_LAB'],
    isMandatory: false,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'git',
    verificationCommand: 'git --version',
    dependencies: [],
  },
  gcc: {
    id: 'gcc',
    name: 'GCC / G++ C/C++ Compilers',
    category: 'Linux',
    description: 'GNU Compiler Collection for compiling and linking C and C++ source code.',
    version: '11.4.0',
    supportedProfiles: ['LINUX_LAB'],
    isMandatory: false,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'build-essential gcc g++',
    verificationCommand: 'gcc --version',
    dependencies: [],
  },
  vim: {
    id: 'vim',
    name: 'Vim Text Editor',
    category: 'Linux',
    description: 'Highly configurable, modal command-line text editor for efficient text and code editing.',
    version: '8.2',
    supportedProfiles: ['LINUX_LAB', 'CYBERSECURITY_LAB', 'DATA_SCIENCE_LAB'],
    isMandatory: false,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'vim',
    verificationCommand: 'vim --version',
    dependencies: [],
  },
  nano: {
    id: 'nano',
    name: 'GNU Nano Editor',
    category: 'Linux',
    description: 'Simple, user-friendly terminal-based text editor for beginners.',
    version: '6.2',
    supportedProfiles: ['LINUX_LAB', 'CYBERSECURITY_LAB', 'DATA_SCIENCE_LAB'],
    isMandatory: false,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'nano',
    verificationCommand: 'nano --version',
    dependencies: [],
  },
  curl: {
    id: 'curl',
    name: 'cURL Network Utility',
    category: 'Linux',
    description: 'Command line tool for transferring data with URLs over HTTP, HTTPS, FTP, and more.',
    version: '7.81.0',
    supportedProfiles: ['LINUX_LAB', 'CYBERSECURITY_LAB', 'DATA_SCIENCE_LAB'],
    isMandatory: false,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'curl',
    verificationCommand: 'curl --version',
    dependencies: [],
  },
  wget: {
    id: 'wget',
    name: 'GNU Wget',
    category: 'Linux',
    description: 'Non-interactive network downloader for retrieving files over HTTP, HTTPS, and FTP.',
    version: '1.21.2',
    supportedProfiles: ['LINUX_LAB', 'CYBERSECURITY_LAB', 'DATA_SCIENCE_LAB'],
    isMandatory: false,
    isDefault: false,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'wget',
    verificationCommand: 'wget --version',
    dependencies: [],
  },
  'net-tools': {
    id: 'net-tools',
    name: 'Linux Networking Utilities',
    category: 'Linux',
    description: 'Essential network diagnostic utilities including ifconfig, netstat, route, and arp.',
    version: '2.10',
    supportedProfiles: ['LINUX_LAB', 'CYBERSECURITY_LAB'],
    isMandatory: false,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'net-tools iproute2 iputils-ping',
    verificationCommand: 'ifconfig --version || ip -V',
    dependencies: [],
  },
  netcat: {
    id: 'netcat',
    name: 'Netcat (nc)',
    category: 'Cybersecurity',
    description: 'Versatile networking tool for reading and writing data across network connections.',
    version: 'Traditional',
    supportedProfiles: ['CYBERSECURITY_LAB', 'LINUX_LAB'],
    isMandatory: false,
    isDefault: true,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'netcat-traditional',
    verificationCommand: 'nc -h',
    dependencies: [],
  },
  htop: {
    id: 'htop',
    name: 'Htop Interactive Process Viewer',
    category: 'Linux',
    description: 'Interactive process viewer and system monitor with color-coded CPU and RAM graphs.',
    version: '3.0.5',
    supportedProfiles: ['LINUX_LAB', 'DATA_SCIENCE_LAB'],
    isMandatory: false,
    isDefault: false,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'htop',
    verificationCommand: 'htop --version',
    dependencies: [],
  },
  tree: {
    id: 'tree',
    name: 'Tree Directory Visualiser',
    category: 'Linux',
    description: 'Recursive directory listing command that produces a depth-indented listing of files.',
    version: '2.0.2',
    supportedProfiles: ['LINUX_LAB', 'CYBERSECURITY_LAB', 'DATA_SCIENCE_LAB'],
    isMandatory: false,
    isDefault: false,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'tree',
    verificationCommand: 'tree --version',
    dependencies: [],
  },
  shellcheck: {
    id: 'shellcheck',
    name: 'ShellCheck Static Analysis',
    category: 'Linux',
    description: 'Static analysis and linting tool for bash/sh shell scripts, catching syntax errors and bugs.',
    version: '0.8.0',
    supportedProfiles: ['LINUX_LAB'],
    isMandatory: false,
    isDefault: false,
    requiresDesktop: false,
    installationMethod: 'apt',
    package: 'shellcheck',
    verificationCommand: 'shellcheck --version',
    dependencies: [],
  },
};

/**
 * Maps a workshop category to its default environment profile
 */
export function getProfileForCategory(category: string): EnvironmentProfileId {
  const norm = category.toLowerCase().trim();
  if (norm.includes('cyber') || norm.includes('security')) {
    return 'CYBERSECURITY_LAB';
  }
  if (norm.includes('data') || norm.includes('science') || norm.includes('ml') || norm.includes('ai')) {
    return 'DATA_SCIENCE_LAB';
  }
  return 'LINUX_LAB';
}

/**
 * Returns all tools compatible with the selected environment profile
 */
export function getAvailableToolsForProfile(profileId: EnvironmentProfileId): ApprovedTool[] {
  return Object.values(TOOL_CATALOGUE).filter((tool) =>
    tool.supportedProfiles.includes(profileId)
  );
}

/**
 * Returns the default tools for an environment profile
 */
export function getDefaultToolsForProfile(profileId: EnvironmentProfileId): ApprovedTool[] {
  const profile = ENVIRONMENT_PROFILES[profileId];
  if (!profile) return [];
  return profile.defaultToolIds
    .map((id) => TOOL_CATALOGUE[id])
    .filter(Boolean) as ApprovedTool[];
}

/**
 * Validates organiser-selected tools, resolves dependencies, and preserves mandatory tools.
 */
export function validateAndResolveTools(
  profileId: EnvironmentProfileId,
  selectedToolIds: string[]
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  resolvedToolIds: string[];
  resolvedTools: ApprovedTool[];
  requiresDesktop: boolean;
  summary: string;
} {
  const profile = ENVIRONMENT_PROFILES[profileId];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!profile) {
    return {
      valid: false,
      errors: [`Unknown environment profile "${profileId}"`],
      warnings: [],
      resolvedToolIds: [],
      resolvedTools: [],
      requiresDesktop: false,
      summary: 'Invalid environment profile.',
    };
  }

  const requestedSet = new Set<string>(selectedToolIds);

  // 1. Ensure mandatory tools cannot be removed
  profile.mandatoryToolIds.forEach((mId) => {
    if (!requestedSet.has(mId)) {
      requestedSet.add(mId);
      warnings.push(`Essential system tool "${TOOL_CATALOGUE[mId]?.name || mId}" was automatically retained.`);
    }
  });

  // 2. Validate all tools exist and are compatible
  Array.from(requestedSet).forEach((toolId) => {
    const tool = TOOL_CATALOGUE[toolId];
    if (!tool) {
      errors.push(`Tool ID "${toolId}" is not in the approved GDG LabOps catalogue.`);
      return;
    }
    if (!tool.supportedProfiles.includes(profileId)) {
      errors.push(
        `Tool "${tool.name}" is not compatible with the ${profile.name} environment.`
      );
    }
  });

  // 3. Resolve dependencies
  let addedDeps = false;
  do {
    addedDeps = false;
    for (const toolId of Array.from(requestedSet)) {
      const tool = TOOL_CATALOGUE[toolId];
      if (tool && tool.dependencies) {
        for (const depId of tool.dependencies) {
          if (!requestedSet.has(depId)) {
            requestedSet.add(depId);
            addedDeps = true;
            const depName = TOOL_CATALOGUE[depId]?.name || depId;
            warnings.push(
              `Added "${depName}" as required dependency for "${tool.name}".`
            );
          }
        }
      }
    }
  } while (addedDeps);

  const resolvedTools = Array.from(requestedSet)
    .map((id) => TOOL_CATALOGUE[id])
    .filter(Boolean) as ApprovedTool[];

  const requiresDesktop = resolvedTools.some((t) => t.requiresDesktop);

  const summary = `${profile.name} configured with ${resolvedTools.length} preinstalled tools${
    requiresDesktop ? ' (GUI Remote Desktop & Terminal Access Enabled)' : ' (Web Terminal Access)'
  }.`;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    resolvedToolIds: Array.from(requestedSet),
    resolvedTools,
    requiresDesktop,
    summary,
  };
}

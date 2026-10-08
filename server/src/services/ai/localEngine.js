/**
 * Offline AI engine.
 *
 * Used automatically when no AI provider key is configured, so the
 * product (and the hackathon demo) works with zero network access.
 * It combines:
 *   1. a curated content bank for high-frequency exam topics
 *   2. a template engine that adapts to any topic name
 *   3. the student's real data for every Copilot answer
 */

/* ==================================================================
 * 1. CONTENT BANK
 * ================================================================== */

const BANK = {
  probability: {
    keywords: ['probability', 'conditional', 'bayes', 'independent event'],
    summary:
      'Probability measures how likely an event is, on a scale from 0 to 1. Almost every exam question is a variation of: identify the sample space, decide whether the events are independent or conditional, then apply the right rule (addition, multiplication, or Bayes).',
    keyPoints: [
      'P(A) = favourable outcomes / total outcomes, and 0 ≤ P(A) ≤ 1',
      'Addition rule: P(A ∪ B) = P(A) + P(B) − P(A ∩ B)',
      'Independent: P(A ∩ B) = P(A)·P(B). Dependent → use conditional probability',
      'P(A|B) = P(A ∩ B) / P(B) — always condition on the smaller, known event',
      'Complement trick: P(not A) = 1 − P(A) saves time on "at least one" questions',
      'Expectation E(X) = Σ x·P(x); Variance Var(X) = E(X²) − [E(X)]²',
    ],
    formulas: [
      { formula: 'P(A|B) = P(A ∩ B) / P(B)', meaning: 'Probability of A given that B already happened' },
      { formula: "P(A|B) = P(B|A)·P(A) / P(B)", meaning: 'Bayes’ theorem — reverse the conditioning' },
      { formula: 'P(A ∪ B) = P(A) + P(B) − P(A ∩ B)', meaning: 'Either A or B happens (inclusion–exclusion)' },
      { formula: 'E(X) = Σ xᵢ·pᵢ', meaning: 'Weighted long-run average of a random variable' },
    ],
    mistakes: [
      'Treating "or" as always exclusive — you must subtract the overlap unless P(A ∩ B) = 0.',
      'Using P(A)·P(B) for events that are NOT independent (e.g. drawing cards without replacement).',
      'Forgetting to divide by P(B) in Bayes’ theorem and stopping halfway.',
      'Reading "at least one" as a single event instead of using 1 − P(none).',
    ],
    example: {
      problem:
        'Two dice are rolled. What is the probability that the sum is 7 OR both dice show the same number?',
      solution:
        'P(sum 7) = 6/36. P(double) = 6/36. Overlap (3,3 only… none sum to 7) = 0. Answer = 6/36 + 6/36 = 12/36 = 1/3.',
    },
    questions: [
      { q: 'A bag has 5 red and 3 blue balls. One ball is drawn at random. What is P(red)?', options: ['5/8', '3/8', '1/2', '5/3'], answer: 0, why: '5 red out of 8 total.' },
      { q: 'Two coins are tossed. What is the probability of getting at least one head?', options: ['1/2', '3/4', '1/4', '1'], answer: 1, why: '1 − P(no head) = 1 − 1/4 = 3/4.' },
      { q: 'P(A) = 0.4, P(B) = 0.5, A and B independent. P(A ∩ B) = ?', options: ['0.9', '0.2', '0.1', '0.45'], answer: 1, why: 'Independent → multiply: 0.4 × 0.5 = 0.2.' },
      { q: 'Which statement defines mutually exclusive events?', options: ['P(A|B) = P(A)', 'P(A ∩ B) = 0', 'P(A) + P(B) = 1', 'P(A) = P(B)'], answer: 1, why: 'They can never occur together, so the intersection is empty.' },
      { q: 'A fair die is thrown. E(odd number) = ?', options: ['2', '3', '1.5', '3.5'], answer: 1, why: 'Values 1,3,5 each with p = 1/6 → 12/6 = ... wait: (1+3+5)/3 = 3.' },
      { q: 'P(A) = 0.3, P(B) = 0.6, P(A ∪ B) = 0.7. Events are:', options: ['Independent', 'Mutually exclusive', 'Neither', 'Complementary'], answer: 2, why: 'Overlap = 0.3+0.6−0.7 = 0.2 ≠ 0 and ≠ 0.18, so neither.' },
      { q: 'In Bayes’ theorem, what is the denominator P(B) also called?', options: ['Prior', 'Likelihood', 'Total probability', 'Posterior'], answer: 2, why: 'P(B) expands to the law of total probability.' },
      { q: 'Var(X) = E(X²) − [E(X)]². If E(X)=2 and E(X²)=6, Var(X) =', options: ['4', '2', '1', '8'], answer: 1, why: '6 − 4 = 2.' },
    ],
  },

  matrices: {
    keywords: ['matrix', 'matrices', 'determinant', 'eigen', 'linear equation'],
    summary:
      'Matrices are rectangular arrays of numbers that encode systems of linear transformations. Exams focus on four operations (add, multiply, transpose, inverse), computing determinants, and solving AX = B.',
    keyPoints: [
      'Addition needs identical dimensions; multiplication needs A’s columns = B’s rows',
      'Multiplication is NOT commutative: AB ≠ BA in general',
      'A is invertible ⟺ det(A) ≠ 0',
      'Row-reduce to echelon form to solve AX = B — fastest method under time pressure',
      'A² = I means A is its own inverse (common in MCQs)',
      'Symmetric matrix: A = Aᵀ; it always has real eigenvalues',
    ],
    formulas: [
      { formula: 'det([[a,b],[c,d]]) = ad − bc', meaning: '2×2 determinant — most common in exams' },
      { formula: 'A⁻¹ = (1/det A)·adj(A)', meaning: 'Inverse via adjugate, valid only if det A ≠ 0' },
      { formula: 'AX = B ⟹ X = A⁻¹B', meaning: 'Solution of a system, only when A is square & invertible' },
      { formula: 'det(AB) = det(A)·det(B)', meaning: 'Determinant of a product is the product of determinants' },
    ],
    mistakes: [
      'Applying the 2×2 determinant formula to 3×3 without expansion by minors.',
      'Multiplying matrices in the wrong order (AB instead of BA).',
      'Assuming a matrix with a zero determinant still has an inverse.',
      'Dividing by a matrix instead of multiplying by its inverse.',
    ],
    example: {
      problem: 'Find the inverse of A = [[2, 3], [1, 4]].',
      solution: 'det = 8 − 3 = 5. adj = [[4, −3], [−1, 2]]. A⁻¹ = (1/5)[[4, −3], [−1, 2]].',
    },
    questions: [
      { q: 'What is the determinant of [[2,3],[1,4]]?', options: ['5', '8', '11', '−5'], answer: 0, why: '2×4 − 3×1 = 8 − 3 = 5.' },
      { q: 'If det(A) = 0, then A is:', options: ['Invertible', 'Singular', 'Symmetric', 'Diagonal'], answer: 1, why: 'Zero determinant means no inverse exists.' },
      { q: 'Matrix multiplication is always:', options: ['Commutative', 'Associative', 'Distributive over addition only', 'Defined for any pair'], answer: 1, why: '(AB)C = A(BC) always holds; AB ≠ BA in general.' },
      { q: 'The product of a 2×3 and a 3×2 matrix has size:', options: ['3×3', '2×2', '2×3', 'Undefined'], answer: 1, why: 'Inner dimensions match (3), outer give 2×2.' },
      { q: 'A⁻¹ exists if and only if:', options: ['A = Aᵀ', 'det(A) ≠ 0', 'A has a zero entry', 'A is 2×2'], answer: 1, why: 'Non-zero determinant ⇔ invertible.' },
      { q: 'What is the adjugate used for?', options: ['Finding eigenvalues', 'Computing A⁻¹', 'Transposing A', 'Rank of A'], answer: 1, why: 'A⁻¹ = adj(A)/det(A).' },
      { q: 'The identity matrix I has the property:', options: ['I² = 0', 'AI = IA = A', 'I = −I', 'det(I) = 0'], answer: 1, why: 'I is the multiplicative identity; det(I) = 1.' },
      { q: 'A system AX = B has no solution when rows of A are:', options: ['Linearly independent', 'Linearly dependent with inconsistent RHS', 'All ones', 'Orthogonal'], answer: 1, why: 'Dependent rows + inconsistent constants → no solution.' },
    ],
  },

  calculus: {
    keywords: ['calculus', 'differentiation', 'integration', 'derivative', 'limit', 'continuity'],
    summary:
      'Calculus is about rates of change (differentation) and accumulation (integration). Master the rule stack — power, product, quotient, chain — then substitution for integrals. Most marks come from applying rules correctly, not from clever tricks.',
    keyPoints: [
      'Power rule: d/dx xⁿ = n·xⁿ⁻¹ — covers 70% of derivative questions',
      'Chain rule for composite functions: differentiate outside, multiply by inside derivative',
      'Product rule when two functions are multiplied; quotient rule when divided',
      '∫ xⁿ dx = xⁿ⁺¹/(n+1) + C (n ≠ −1); ∫ 1/x dx = ln|x| + C',
      'Differentiation and integration are inverse operations — use one to check the other',
      'Stationary point: f′(x) = 0; test with f″(x) or a sign change',
    ],
    formulas: [
      { formula: "d/dx (xⁿ) = n·xⁿ⁻¹", meaning: 'Power rule' },
      { formula: "(fg)′ = f′g + fg′", meaning: 'Product rule' },
      { formula: "(f/g)′ = (f′g − fg′)/g²", meaning: 'Quotient rule' },
      { formula: "d/dx eˣ = eˣ,  d/dx ln x = 1/x", meaning: 'The two functions that are their own derivatives' },
      { formula: '∫ₐᵇ f dx = F(b) − F(a)', meaning: 'Fundamental theorem of calculus' },
    ],
    mistakes: [
      'Forgetting the chain-rule multiplier after differentiating the outer function.',
      'Dropping the constant of integration + C in indefinite integrals.',
      'Cancelling terms incorrectly in quotient-rule applications.',
      'Mixing up d/dx of sin x (cos x) with cos x (−sin x).',
    ],
    example: {
      problem: 'Differentiate f(x) = x³·eˣ.',
      solution: 'Product rule: f′ = 3x²·eˣ + x³·eˣ = x²eˣ(3 + x).',
    },
    questions: [
      { q: 'd/dx (x⁵) =', options: ['5x⁴', 'x⁴', '5x⁵', '5'], answer: 0, why: 'Bring the power down, reduce it by 1.' },
      { q: '∫ 6x² dx =', options: ['2x³ + C', '6x³ + C', '3x³ + C', '2x² + C'], answer: 0, why: '6·x³/3 = 2x³, plus the constant.' },
      { q: 'd/dx (sin 3x) =', options: ['cos 3x', '3cos 3x', '−3cos 3x', '3sin 3x'], answer: 1, why: 'Chain rule: derivative of inside (3) multiplies.' },
      { q: 'The derivative of ln x is:', options: ['1/x', 'x', 'ln x', 'eˣ'], answer: 0, why: 'Standard result.' },
      { q: 'If f′(x) = 0 the point is called:', options: ['Inflection', 'Stationary', 'Discontinuous', 'Asymptote'], answer: 1, why: 'Zero gradient = stationary point.' },
      { q: '∫ (1/x) dx =', options: ['x⁻² + C', 'ln|x| + C', '1 + C', 'x + C'], answer: 1, why: 'The power rule fails at n = −1; it becomes ln.' },
      { q: 'd/dx (x²·sin x) requires the:', options: ['Chain rule only', 'Product rule', 'Quotient rule', 'Implicit rule'], answer: 1, why: 'Two functions multiplied together.' },
      { q: 'Second derivative f″(x) > 0 at a stationary point means:', options: ['Maximum', 'Minimum', 'Point of inflection', 'No conclusion'], answer: 1, why: 'Positive concavity → local minimum.' },
    ],
  },

  statistics: {
    keywords: ['statistics', 'mean', 'median', 'standard deviation', 'variance', 'correlation', 'distribution'],
    summary:
      'Statistics turns raw data into decisions. Exams test whether you can pick the right average, spread and measure of relationship — then interpret them in one sentence.',
    keyPoints: [
      'Mean is sensitive to outliers; median is robust — use median for skewed data',
      'Standard deviation is in the SAME unit as the data; variance is squared',
      'Z-score: how many standard deviations a value sits from the mean',
      'Correlation r ∈ [−1, 1]; r close to 0 means no linear relationship, not no relationship',
      'In a normal distribution ≈68% within 1σ, 95% within 2σ, 99.7% within 3σ',
      'Always state the shape and spread together — mean alone is misleading',
    ],
    formulas: [
      { formula: 'x̄ = Σx / n', meaning: 'Arithmetic mean' },
      { formula: 'σ = √(Σ(x − x̄)² / n)', meaning: 'Population standard deviation' },
      { formula: 'z = (x − x̄) / σ', meaning: 'How unusual a value is' },
      { formula: 'r = Σ(x−x̄)(y−ȳ) / √[Σ(x−x̄)² Σ(y−ȳ)²]', meaning: 'Pearson correlation coefficient' },
    ],
    mistakes: [
      'Using the mean for heavily skewed data (income, marks with one very low outlier).',
      'Dividing by n−1 when the question asks for a POPULATION parameter.',
      'Quoting r = 0.9 as "causes" — correlation never proves causation.',
      'Confusing variance (squared units) with standard deviation.',
    ],
    example: {
      problem: 'Find the standard deviation of 2, 4, 4, 4, 5, 5, 7, 9.',
      solution: 'Mean = 5. Squared deviations sum = 32. Variance = 32/8 = 4 → σ = 2.',
    },
    questions: [
      { q: 'The median of 3, 7, 9, 12, 15 is:', options: ['9', '7', '9.4', '12'], answer: 0, why: 'Middle value of the ordered list.' },
      { q: 'Which average is least affected by outliers?', options: ['Mean', 'Median', 'Range', 'Variance'], answer: 1, why: 'Median depends only on position.' },
      { q: 'Variance of a data set with σ = 3 is:', options: ['3', '6', '9', '1.73'], answer: 2, why: 'Variance = σ².' },
      { q: 'r = −0.85 indicates:', options: ['No relationship', 'Strong negative', 'Strong positive', 'Causation'], answer: 1, why: 'Close to −1 and negative.' },
      { q: 'About 95% of a normal distribution lies within:', options: ['1σ', '2σ', '3σ', '0.5σ'], answer: 1, why: 'The empirical 68–95–99.7 rule.' },
      { q: 'z-score measures:', options: ['Skewness', 'Standard deviations from the mean', 'Sample size', 'Mode frequency'], answer: 1, why: 'z = (x − mean)/σ.' },
      { q: 'The range of 11, 15, 19, 23 is:', options: ['4', '12', '17', '34'], answer: 1, why: '23 − 11 = 12.' },
      { q: 'Mode of 2, 3, 3, 5, 7 is:', options: ['3', '2', '5', '4'], answer: 0, why: 'Most frequent value.' },
    ],
  },

  algebra: {
    keywords: ['algebra', 'quadratic', 'equation', 'polynomial', 'factoris', 'simultaneous'],
    summary:
      'Algebra is the grammar of the whole paper. Quadratics, factorisation and simultaneous equations appear in some form in nearly every exam — usually as a stepping stone to a bigger question.',
    keyPoints: [
      'Quadratic formula: x = [−b ± √(b² − 4ac)] / 2a',
      'Discriminant b² − 4ac: >0 two roots, =0 one repeated root, <0 no real roots',
      'Factorising is faster than formula — always try it first',
      'Expand then collect like terms before anything else',
      'For simultaneous equations: eliminate a variable by making coefficients match',
      'Check your answer by substitution — 30 seconds buys real marks',
    ],
    formulas: [
      { formula: 'x = [−b ± √(b² − 4ac)] / 2a', meaning: 'Roots of ax² + bx + c = 0' },
      { formula: 'b² − 4ac', meaning: 'Discriminant — tells you the nature of the roots' },
      { formula: '(a + b)² = a² + 2ab + b²', meaning: 'Perfect square expansion' },
      { formula: 'Sum of roots = −b/a, Product = c/a', meaning: 'Vieta’s formulas — no solving required' },
    ],
    mistakes: [
      'Sign errors when expanding −(a − b) terms.',
      'Forgetting to divide both sides by the coefficient of x.',
      'Losing the ± when applying the quadratic formula.',
      'Cancelling a variable term across an inequality without flipping the sign.',
    ],
    example: {
      problem: 'Solve x² − 5x + 6 = 0.',
      solution: 'Factorise: (x − 2)(x − 3) = 0 → x = 2 or x = 3. Check: 4 − 10 + 6 = 0 ✓',
    },
    questions: [
      { q: 'Roots of x² − 7x + 12 = 0 are:', options: ['2 and 6', '3 and 4', '−3 and −4', '1 and 12'], answer: 1, why: '(x−3)(x−4) = 0.' },
      { q: 'If b² − 4ac < 0 the equation has:', options: ['Two real roots', 'One repeated root', 'No real roots', 'Infinite roots'], answer: 2, why: 'Negative discriminant → complex roots only.' },
      { q: 'Expand (x + 4)² =', options: ['x² + 16', 'x² + 8x + 16', 'x² + 4x + 16', 'x² + 8x + 8'], answer: 1, why: 'a² + 2ab + b².' },
      { q: 'Sum of roots of 2x² − 6x + 4 = 0 is:', options: ['3', '−3', '2', '1.5'], answer: 0, why: '−b/a = 6/2 = 3.' },
      { q: 'Solve 3x = 21:', options: ['x = 7', 'x = 18', 'x = 24', 'x = 63'], answer: 0, why: 'Divide both sides by 3.' },
      { q: 'Factorise x² − 9:', options: ['(x−3)(x+3)', '(x−9)(x+1)', '(x−3)²', 'x(x−9)'], answer: 0, why: 'Difference of two squares.' },
      { q: 'In ax²+bx+c, the product of roots is:', options: ['−b/a', 'c/a', 'b/c', 'a/c'], answer: 1, why: 'Vieta: product = c/a.' },
      { q: 'Simultaneous equations are best solved by:', options: ['Guessing', 'Elimination or substitution', 'Graphing only', 'Adding all terms'], answer: 1, why: 'Both are systematic and fast.' },
    ],
  },

  physics: {
    keywords: ['physics', 'motion', 'force', 'newton', 'energy', 'velocity', 'momentum', 'electricity'],
    summary:
      'Physics exams reward students who write the formula first, substitute second, and interpret last. Almost every numerical question is a three-line solution.',
    keyPoints: [
      'Write the formula before any number — method marks are free marks',
      'Newton’s laws: F = ma; action–reaction pairs act on DIFFERENT bodies',
      'Energy is conserved: KE + PE + work against friction = constant',
      'Velocity is a vector, speed is a scalar — direction matters',
      'Momentum is conserved in every collision; kinetic energy only in elastic ones',
      'Always check units and order of magnitude at the end',
    ],
    formulas: [
      { formula: 'v = u + at', meaning: 'Velocity–time' },
      { formula: 's = ut + ½at²', meaning: 'Displacement–time' },
      { formula: 'v² = u² + 2as', meaning: 'No time needed' },
      { formula: 'F = ma', meaning: 'Newton’s second law' },
      { formula: 'Eₖ = ½mv²,  Eₚ = mgh', meaning: 'Kinetic and potential energy' },
      { formula: 'p = mv', meaning: 'Momentum' },
    ],
    mistakes: [
      'Mixing up u (initial) and v (final) in kinematics equations.',
      'Using mass and weight interchangeably (kg vs N).',
      'Forgetting to convert km/h to m/s before substituting.',
      'Applying conservation of kinetic energy to inelastic collisions.',
    ],
    example: {
      problem: 'A car accelerates from 0 to 20 m/s in 8 s. Find the acceleration and distance.',
      solution: 'a = (v−u)/t = 20/8 = 2.5 m/s². s = ut + ½at² = 0 + ½(2.5)(64) = 80 m.',
    },
    questions: [
      { q: 'SI unit of force is:', options: ['Joule', 'Newton', 'Watt', 'Pascal'], answer: 1, why: '1 N = 1 kg·m/s².' },
      { q: 'A 5 kg body accelerates at 2 m/s². Force =', options: ['10 N', '2.5 N', '7 N', '10 kg'], answer: 0, why: 'F = ma = 5 × 2.' },
      { q: 'A body at rest has:', options: ['Zero momentum', 'Maximum momentum', 'Infinite energy', 'Negative velocity'], answer: 0, why: 'p = mv and v = 0.' },
      { q: 'Which is a vector quantity?', options: ['Speed', 'Mass', 'Displacement', 'Temperature'], answer: 2, why: 'Only displacement has magnitude and direction.' },
      { q: 'Kinetic energy formula is:', options: ['mgh', '½mv²', 'mv', 'ma'], answer: 1, why: 'Eₖ = ½mv².' },
      { q: 'Action and reaction forces act on:', options: ['The same body', 'Different bodies', 'The ground only', 'No body'], answer: 1, why: 'Newton’s third law — always on different bodies.' },
      { q: 'A car goes 100 m in 20 s. Average speed =', options: ['5 m/s', '2 m/s', '20 m/s', '50 m/s'], answer: 0, why: '100/20 = 5 m/s.' },
      { q: 'Total energy in a closed system is:', options: ['Created', 'Destroyed', 'Conserved', 'Random'], answer: 2, why: 'Conservation of energy.' },
    ],
  },

  chemistry: {
    keywords: ['chemistry', 'mole', 'bond', 'reaction', 'organic', 'acid', 'periodic', 'stoichiometr'],
    summary:
      'Chemistry is three subjects in one: calculations (moles), explanations (bonding/structure), and patterns (periodicity + organic mechanisms). Moles questions are the most reliably marks-scoring.',
    keyPoints: [
      'n = mass/Mr — start every numerical with this line',
      'Moles of gas at rtp: n = volume/24 dm³ (or /22.4 L for STP)',
      'Balance the equation BEFORE calculating anything',
      'Ionic bonds form between metals and non-metals; covalent between non-metals',
      'Acids donate H⁺, bases accept it — neutralisation makes salt + water',
      'Organic: learn the homologous series, general formula, and one test for each functional group',
    ],
    formulas: [
      { formula: 'n = m / Mr', meaning: 'Moles from mass' },
      { formula: 'n = V / 24', meaning: 'Moles of gas in dm³ at rtp' },
      { formula: 'M = n / V(L)', meaning: 'Molarity (mol/dm³)' },
      { formula: 'percentage yield = (actual/theoretical) × 100', meaning: 'How efficient the reaction was' },
    ],
    mistakes: [
      'Using relative atomic mass where molar mass is required.',
      'Forgetting to balance the equation before mole ratios.',
      'Confusing empirical formula (simplest ratio) with molecular formula.',
      'Mixing up oxidation (loss of electrons) and reduction (gain) — use OIL RIG.',
    ],
    example: {
      problem: 'Find the number of moles in 12 g of carbon (Ar = 12).',
      solution: 'n = m/Mr = 12/12 = 1 mol.',
    },
    questions: [
      { q: 'Number of moles in 24 g of Mg (Ar = 24):', options: ['1', '2', '24', '0.5'], answer: 0, why: 'n = 24/24 = 1.' },
      { q: 'Volume of 2 moles of gas at rtp:', options: ['24 dm³', '48 dm³', '12 dm³', '22.4 dm³'], answer: 1, why: '2 × 24 dm³.' },
      { q: 'Oxidation is:', options: ['Gain of electrons', 'Loss of electrons', 'Gain of hydrogen', 'Loss of oxygen'], answer: 1, why: 'OIL RIG — Oxidation Is Loss.' },
      { q: 'Empirical formula of a compound with C:H = 1:4 is:', options: ['CH', 'CH₂', 'CH₄', 'C₂H₄'], answer: 2, why: 'Simplest whole-number ratio.' },
      { q: 'A substance that donates H⁺ is a:', options: ['Base', 'Acid', 'Salt', 'Oxide'], answer: 1, why: 'Brønsted–Lowry acid.' },
      { q: 'pH of a neutral solution at 25°C is:', options: ['0', '7', '14', '1'], answer: 1, why: 'Neutral = 7.' },
      { q: 'Which is an ionic bond?', options: ['H₂O', 'NaCl', 'CO₂', 'CH₄'], answer: 1, why: 'Metal + non-metal electron transfer.' },
      { q: 'Percentage yield 50% means:', options: ['Reaction failed', 'Half the theoretical amount formed', 'Double the amount', 'No product'], answer: 1, why: 'actual/theoretical × 100 = 50.' },
    ],
  },

  algorithms: {
    keywords: ['algorithm', 'data structure', 'complexity', 'sorting', 'tree', 'graph', 'big o', 'programming'],
    summary:
      'CS exams test whether you can trace code precisely and reason about cost. Big-O, tracing loops, and choosing the right data structure account for most marks.',
    keyPoints: [
      'Big-O describes growth as n → ∞, ignoring constants and lower-order terms',
      'Binary search needs sorted data: O(log n); linear search is O(n)',
      'Arrays: O(1) index, O(n) insert/delete in the middle; linked lists are the reverse',
      'Trees: search = height of tree — balanced = O(log n), skewed = O(n)',
      'Tracing with a small example finds bugs faster than re-reading code',
      'Recursion needs a base case — always identify it first',
    ],
    formulas: [
      { formula: 'O(1) ⊂ O(log n) ⊂ O(n) ⊂ O(n log n) ⊂ O(n²) ⊂ O(2ⁿ)', meaning: 'Complexity ranking' },
      { formula: 'Binary search steps = ⌈log₂ n⌉', meaning: 'Halving the search space each step' },
      { formula: 'Best case ≠ Worst case', meaning: 'State which one you are quoting' },
    ],
    mistakes: [
      'Quoting average-case complexity when the question asks for worst case.',
      'Forgetting that a sorted array is required for binary search.',
      'Off-by-one errors when tracing loop bounds.',
      'Confusing space complexity with time complexity.',
    ],
    example: {
      problem: 'What is the time complexity of a loop that halves i each iteration, from n to 1?',
      solution: 'The loop runs ⌈log₂ n⌉ times → O(log n).',
    },
    questions: [
      { q: 'Binary search time complexity is:', options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], answer: 1, why: 'The search space halves each step.' },
      { q: 'Worst-case complexity of linear search is:', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], answer: 2, why: 'The target may be last or absent.' },
      { q: 'Which data structure is LIFO?', options: ['Queue', 'Stack', 'Array', 'Graph'], answer: 1, why: 'Last in, first out.' },
      { q: 'Inserting at the head of a linked list is:', options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'], answer: 2, why: 'Only pointer updates are needed.' },
      { q: 'A balanced BST searches in:', options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], answer: 1, why: 'Height ≈ log₂ n.' },
      { q: 'Which sorting is O(n log n) in the average case?', options: ['Bubble sort', 'Insertion sort', 'Merge sort', 'Selection sort'], answer: 2, why: 'Merge sort guarantees O(n log n).' },
      { q: 'A tree with n nodes and n−1 edges is:', options: ['Cyclic', 'Disconnected', 'Acyclic (forest)', 'Complete'], answer: 2, why: 'Exactly a tree/forest structure.' },
      { q: 'Recursion must have:', options: ['A global variable', 'A base case', 'A loop', 'Two parameters'], answer: 1, why: 'Without a base case it never terminates.' },
    ],
  },

  /* ---------------------------------------------------------- placement */

  aptitude: {
    keywords: [
      'percentage', 'profit', 'discount', 'speed', 'distance', 'ratio', 'proportion',
      'number system', 'time & work', 'data interpretation', 'series', 'analogy',
      'blood relation', 'direction', 'coding', 'comprehension', 'alligation', 'average',
      'arithmetic', 'aptitude',
    ],
    summary:
      'Aptitude rounds are a speed game, not a knowledge test. Nearly every question collapses to one of a dozen templates — convert to a base (percent, ratio, per-unit), apply the template, and check whether the answer is even plausible before marking it.',
    keyPoints: [
      'Percent means "per 100" — write x% as x/100 before anything else',
      'Percentage change = (new − old)/old × 100; always divide by the ORIGINAL value',
      'Profit % is on cost price unless the question says on selling price',
      'Speed = distance/time — convert km/h to m/s by ×5/18 (and m/s to km/h by ×18/5)',
      'Ratio problems: scale both quantities by the same factor; never add unlike units',
      'In Data Interpretation, read the question BEFORE the chart and estimate first',
    ],
    formulas: [
      { formula: 'x% of N = N × x / 100', meaning: 'The one line almost every percentage question starts with' },
      { formula: 'Profit% = (SP − CP) / CP × 100', meaning: 'Profit or loss measured on cost price' },
      { formula: 'km/h → m/s: × 5/18', meaning: 'Unit conversion used in every speed question' },
      { formula: 'Work rate: 1 day work = 1 / T', meaning: 'Combine rates by adding them, never by adding times' },
    ],
    mistakes: [
      'Using the new value instead of the original value as the percentage base.',
      'Applying profit % on selling price when the question meant cost price.',
      'Mixing km/h and m/s without converting — answers end up 3.6× off.',
      'Reading the wrong axis or wrong year in a Data Interpretation chart under time pressure.',
    ],
    example: {
      problem: 'A shirt priced at ₹1,200 is discounted by 25% and then taxed 10%. Final price?',
      solution:
        'Discount: 1200 × 0.75 = ₹900. Tax: 900 × 1.10 = ₹990. Always discount first, then tax — the order changes the answer.',
    },
    questions: [
      { q: '20% of 450 =', options: ['90', '45', '80', '100'], answer: 0, why: '450 × 20/100 = 90.' },
      { q: 'A number becomes 36 after a 10% increase. Original =', options: ['32.4', '39.6', '40', '32'], answer: 0, why: '1.1x = 36 → x = 36/1.1 = 32.4.' },
      { q: 'CP ₹250, SP ₹290. Profit % =', options: ['16%', '40%', '13.8%', '20%'], answer: 0, why: '(290−250)/250 × 100 = 16%.' },
      { q: '72 km/h in m/s is:', options: ['20 m/s', '259 m/s', '12 m/s', '18 m/s'], answer: 0, why: '72 × 5/18 = 20 m/s.' },
      { q: 'A does a job in 10 days, B in 15. Together =', options: ['6 days', '12.5 days', '25 days', '5 days'], answer: 0, why: 'Rates 1/10 + 1/15 = 1/6 → 6 days.' },
      { q: 'The ratio 18:24 simplifies to', options: ['3:4', '6:8', '9:13', '2:3'], answer: 0, why: 'Divide both by 6.' },
      { q: 'Successive discounts 20% then 10% equal a single discount of:', options: ['28%', '30%', '25%', '18%'], answer: 0, why: '1 − 0.8 × 0.9 = 1 − 0.72 = 28%.' },
      { q: 'In an aptitude round, the best first move is:', options: ['Scan all questions and solve the quick ones first', 'Solve strictly in order', 'Read every question twice before starting', 'Guess and move on immediately'], answer: 0, why: 'Marks per minute is the game — secure the cheap marks, then attack the hard ones.' },
    ],
  },

  dsa: {
    keywords: [
      'array', 'string', 'hash', 'pointer', 'sliding window', 'recursion', 'backtracking',
      'stack', 'queue', 'linked list', 'bst', 'tree', 'trees', 'graph', 'graphs',
      'dynamic programming', 'greedy', 'two pointer', 'bfs', 'dfs', 'leetcode', 'inversion', 'dsa',
    ],
    summary:
      'Interview DSA is judged on three things: picking the right data structure, stating the complexity out loud, and writing code that survives edge cases. Most problems are a known pattern in disguise — identify the pattern before you code.',
    keyPoints: [
      'Name the pattern first: two pointers, sliding window, hash lookup, BFS/DFS, or a heap',
      'Arrays give O(1) indexing but O(n) insertion in the middle; linked lists reverse that',
      'Hash maps turn nested lookups into O(1) — the single most common optimisation',
      'State time AND space complexity out loud; interviewers grade the reasoning, not just the code',
      'Trees: recursive solution = think at one node + trust the recursion; base case first',
      'Always walk through an empty/single-element input — most bugs live there',
    ],
    formulas: [
      { formula: 'Binary search: O(log n) on sorted data', meaning: 'Halve the search space each step' },
      { formula: 'Hash lookup/insert: O(1) average', meaning: 'Trade memory for speed' },
      { formula: 'Sliding window: O(n) instead of O(n²)', meaning: 'Reuse work instead of recomputing it' },
      { formula: 'n nodes tree → balanced height log n, skewed height n', meaning: 'Why balanced structures matter' },
    ],
    mistakes: [
      'Optimising with a hash map without realising the question needed ORDER, so the answer was wrong.',
      'Off-by-one in loop bounds and mid calculation during binary search.',
      'Quoting average-case O(1) for hash maps without mentioning worst-case O(n).',
      'Writing recursion without a base case, then debugging the stack overflow live.',
    ],
    example: {
      problem: 'Find two numbers in an array that add up to a target.',
      solution:
        'Brute force is O(n²). With a hash map: store value → index, and for each x check whether (target − x) is already present. O(n) time, O(n) space, one pass.',
    },
    questions: [
      { q: 'Average time to search a key in a hash map is:', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], answer: 0, why: 'Direct indexing by hash — O(1) average, O(n) worst case.' },
      { q: 'Which traversal of a BST returns keys in sorted order?', options: ['In-order', 'Pre-order', 'Post-order', 'Level-order'], answer: 0, why: 'Left → node → right visits values ascending.' },
      { q: 'Sliding window is most useful when you need:', options: ['A contiguous subarray/substring property', 'All permutations of an array', 'A sorted copy of the data', 'Random sampling'], answer: 0, why: 'It maintains a window in O(1) per step instead of recomputing.' },
      { q: 'Worst-case complexity of binary search is:', options: ['O(log n)', 'O(n)', 'O(1)', 'O(n²)'], answer: 0, why: 'The search space halves every step regardless of position.' },
      { q: 'BFS on an unweighted graph finds shortest paths using a:', options: ['Queue', 'Stack', 'Priority queue', 'Hash set'], answer: 0, why: 'FIFO queue explores level by level.' },
      { q: 'The base case in recursion exists to:', options: ['Stop the recursion', 'Speed up the code', 'Sort the output', 'Free memory'], answer: 0, why: 'Without it the calls never terminate.' },
      { q: 'Inserting at the head of a singly linked list is:', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], answer: 0, why: 'Only the head pointer is updated.' },
      { q: 'Before writing code in an interview you should:', options: ['Restate the problem and confirm constraints with the interviewer', 'Start typing immediately', 'Optimise to the best possible solution first', 'Ask for the answer'], answer: 0, why: 'Clarifying scope avoids solving the wrong problem — the top rubric item.' },
    ],
  },

  dbms: {
    keywords: ['dbms', 'sql', 'normaliz', 'transaction', 'join', 'index', 'acid', 'primary key', 'foreign key', 'query', 'database'],
    summary:
      'Core CS interviews test DBMS as: write correct SQL, explain why an index helps, and reason about what happens when two transactions collide. Normalisation and ACID come up in almost every theory round.',
    keyPoints: [
      'SELECT → WHERE → GROUP BY → HAVING → ORDER BY executes in that order',
      'INNER JOIN keeps matching rows; LEFT JOIN keeps every row from the left table',
      'Primary key = unique + not null; foreign key references another table’s key',
      '1NF: atomic values · 2NF: no partial dependency · 3NF: no transitive dependency',
      'Index = B-tree shortcut on a column — speeds reads, slows writes',
      'ACID: Atomicity, Consistency, Isolation, Durability — each word has a failure mode',
    ],
    formulas: [
      { formula: 'SELECT cols FROM t1 JOIN t2 ON t1.k = t2.k WHERE …', meaning: 'The canonical join skeleton' },
      { formula: 'COUNT(*) vs COUNT(col)', meaning: 'COUNT(col) ignores NULLs — a favourite gotcha' },
      { formula: 'GROUP BY aggregates rows sharing a value', meaning: 'Everything in SELECT must be grouped or aggregated' },
      { formula: 'Isolation levels: Read Uncommitted → Serializable', meaning: 'More isolation = fewer anomalies = more locking' },
    ],
    mistakes: [
      'Using WHERE with an aggregate (use HAVING after GROUP BY).',
      'Confusing DELETE (rows) with DROP (table) in a live-systems question.',
      'Assuming joins always multiply rows — LEFT JOIN with no match returns one NULL-extended row.',
      'Normalising to 3NF and then complaining the query is slow — joins have a cost too.',
    ],
    example: {
      problem: 'Find every customer with no orders.',
      solution:
        "SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL; — the LEFT JOIN + NULL check is the classic 'anti-join'.",
    },
    questions: [
      { q: 'Which clause filters rows AFTER grouping?', options: ['HAVING', 'WHERE', 'ORDER BY', 'FROM'], answer: 0, why: 'WHERE filters rows first; HAVING filters the groups.' },
      { q: 'A table with a primary key is guaranteed to be:', options: ['Unique and non-null on that column', 'Fully normalised', 'Indexed automatically in every engine', 'Free of NULLs everywhere'], answer: 0, why: 'PRIMARY KEY = UNIQUE + NOT NULL constraints.' },
      { q: 'COUNT(*) differs from COUNT(col) because:', options: ['COUNT(col) skips NULLs', 'COUNT(*) is faster always', 'They are identical', 'COUNT(col) counts distinct values'], answer: 0, why: 'Aggregate over a column ignores NULL entries.' },
      { q: 'Which anomaly does normalisation primarily reduce?', options: ['Redundancy and update anomalies', 'Network latency', 'Compiler errors', 'Backup size only'], answer: 0, why: 'Repeated data is what makes updates inconsistent.' },
      { q: 'An index most improves:', options: ['SELECT/WHERE lookups on indexed columns', 'INSERT into that table', 'Transaction rollback', 'Disk space used'], answer: 0, why: 'Reads get faster; writes pay the index-maintenance cost.' },
      { q: 'ACID "Isolation" means:', options: ['Concurrent transactions do not see each other’s partial state', 'Data survives crashes', 'All constraints are valid', 'Transactions are batched'], answer: 0, why: 'Isolation prevents dirty reads and lost updates.' },
      { q: 'Which SQL clause removes duplicate rows from a result?', options: ['DISTINCT', 'UNIQUE', 'GROUP', 'HAVING'], answer: 0, why: 'SELECT DISTINCT col … removes duplicates.' },
      { q: 'A foreign key enforces:', options: ['Referential integrity', 'Uniqueness', 'Ordering', 'Sorting speed'], answer: 0, why: 'It forbids values that do not exist in the parent key.' },
    ],
  },

  os: {
    keywords: ['operating system', 'scheduling', 'process', 'thread', 'deadlock', 'memory', 'paging', 'virtual memory', 'semaphore', 'cpu', 'mutex', 'context switch'],
    summary:
      'Operating Systems questions reward students who can narrate what the machine is doing: how processes get the CPU, how memory is faked with paging, and what has to be true for a deadlock to exist.',
    keyPoints: [
      'Process = program + PCB; thread = lighter unit sharing the process address space',
      'CPU scheduling: FCFS, SJF, Round Robin, Priority — know who starves under each',
      'Deadlock needs ALL four: mutual exclusion, hold-and-wait, no preemption, circular wait',
      'Virtual memory lets a process run with only part of it in RAM (paging + page faults)',
      'Semaphore (kernel) vs mutex (owner-locked) — only a mutex allows ownership',
      'Thrashing = too many frames in use → paging dominates CPU time',
    ],
    formulas: [
      { formula: 'Turnaround = Completion − Arrival', meaning: 'Total time a job spends in the system' },
      { formula: 'Waiting = Turnaround − Burst time', meaning: 'Time spent NOT running' },
      { formula: 'Context switch = save state → load next', meaning: 'Pure overhead — keep it small' },
      { formula: 'Effective access time = (1−p)·t + p·fault_time', meaning: 'Cost of paging with page-fault rate p' },
    ],
    mistakes: [
      'Describing a thread as a separate process — they share address space, that is the point.',
      'Saying Round Robin is "fair" without noting a tiny quantum means constant context switching.',
      'Forgetting one of the four deadlock conditions — all four must hold simultaneously.',
      'Treating page fault as an error instead of a normal memory-management event.',
    ],
    example: {
      problem: 'Bursts 5, 3, 8 ms arrive together — average waiting time under FCFS vs SJF?',
      solution:
        'FCFS order 5,3,8 → waiting 0+5+8 = 13 → 4.33 ms avg. SJF order 3,5,8 → waiting 0+3+8 = 11 → 3.67 ms avg. SJF wins on average but can starve long jobs.',
    },
    questions: [
      { q: 'Which scheduling algorithm can starve long jobs?', options: ['SJF / priority', 'Round Robin', 'FCFS', 'FIFO'], answer: 0, why: 'Continually arriving short jobs keep pushing the long one back.' },
      { q: 'All four deadlock conditions must be:', options: ['Held simultaneously', 'Present in any one process', 'Mutually exclusive', 'Checked at compile time'], answer: 0, why: 'Break any single condition and deadlock cannot occur.' },
      { q: 'A page fault occurs when:', options: ['A needed page is not in physical memory', 'The disk is full', 'A process ends', 'An index is missing'], answer: 0, why: 'The OS must fetch the page from secondary storage.' },
      { q: 'Threads in one process share:', options: ['Address space', 'Stack each (separate)', 'Program counter each (separate)', 'Register set'], answer: 0, why: 'Code, heap and open files are shared; stack/PC/registers are per-thread.' },
      { q: 'Preemptive scheduling means:', options: ['The OS can forcibly take the CPU back', 'Jobs run to completion', 'No queue is used', 'Threads are blocked'], answer: 0, why: 'Time slicing is a form of preemption.' },
      { q: 'Round Robin is best described as:', options: ['FCFS with time slicing', 'Always fastest', 'Non-preemptive', 'Priority based'], answer: 0, why: 'Each job gets a quantum, then goes to the queue tail.' },
      { q: 'A binary semaphore differs from a mutex by:', options: ['Allowing no ownership by the holder', 'Supporting 0/1 values only', 'Being faster', 'Working across machines'], answer: 0, why: 'A mutex must be released by the thread that locked it.' },
      { q: 'Thrashing is caused by:', options: ['Too little memory per process', 'Too many CPUs', 'Fast disks', 'Long quanta'], answer: 0, why: 'The working set does not fit, so pages are constantly swapped.' },
    ],
  },

  networks: {
    keywords: ['network', 'osi', 'tcp', 'udp', 'routing', 'protocol', 'dns', 'http', 'bandwidth', 'latency', 'subnet', 'handshake', 'socket'],
    summary:
      'Networking questions check whether you can trace a request from your keyboard to a server and back: which layer, which protocol, what is guaranteed, and what happens when a packet is lost.',
    keyPoints: [
      'OSI 7 layers: Physical, Data Link, Network, Transport, Session, Presentation, Application',
      'IP addresses the machine; ports address the application on that machine',
      'TCP = connection-oriented, ordered, retransmits; UDP = fast, best-effort',
      'Three-way handshake: SYN → SYN-ACK → ACK',
      'DNS resolves names to IPs; HTTP(S) then carries the request over TCP port 80/443',
      'Routing happens at layer 3; switching at layer 2; firewalls usually at layers 3–4',
    ],
    formulas: [
      { formula: 'Throughput ≈ Window size / RTT', meaning: 'Why TCP slows on high-latency links' },
      { formula: 'Latency = propagation + transmission + queueing + processing', meaning: 'The four parts of delay' },
      { formula: 'Usable hosts = 2^(32−prefix) − 2', meaning: 'Subnet size for a /prefix IPv4 block' },
      { formula: 'Bandwidth ≠ latency', meaning: 'Capacity of the pipe vs time to travel it' },
    ],
    mistakes: [
      'Saying TCP "guarantees delivery" without adding "eventually, or it errors out".',
      'Confusing latency with bandwidth — a fat pipe can still be slow to respond.',
      'Placing DNS at the transport layer; it is an application-layer service.',
      'Assuming UDP is unreliable in the sense of useless — it is exactly why live video uses it.',
    ],
    example: {
      problem: 'What happens when you type example.com and press Enter?',
      solution:
        'DNS lookup → TCP three-way handshake → TLS handshake (HTTPS) → HTTP GET request → server response → TCP FIN. Name each layer/protocol and you have the standard interview answer.',
    },
    questions: [
      { q: 'Which layer does IP operate at?', options: ['Network (3)', 'Data Link (2)', 'Transport (4)', 'Application (7)'], answer: 0, why: 'IP provides logical addressing and routing between networks.' },
      { q: 'TCP establishes a connection via:', options: ['Three-way handshake', 'Two-way SYN', 'A DNS query', 'An ARP broadcast'], answer: 0, why: 'SYN → SYN-ACK → ACK.' },
      { q: 'DNS is used to:', options: ['Resolve hostnames to IP addresses', 'Encrypt traffic', 'Assign MAC addresses', 'Compress packets'], answer: 0, why: 'Name → address translation is DNS’s whole job.' },
      { q: 'HTTPS default port is:', options: ['443', '80', '22', '53'], answer: 0, why: 'HTTP is 80; TLS-wrapped HTTP is 443.' },
      { q: 'UDP is preferred for live video because it:', options: ['Skips retransmission overhead', 'Guarantees ordering', 'Compresses streams', 'Is encrypted by default'], answer: 0, why: 'For live media a late packet is worse than a lost one.' },
      { q: 'ARP maps:', options: ['IP address → MAC address', 'Hostname → IP', 'Port → process', 'URL → server'], answer: 0, why: 'Address Resolution Protocol works on the local link.' },
      { q: 'The OSI presentation layer handles:', options: ['Data formatting and encryption', 'Routing', 'Error recovery on links', 'Physical signalling'], answer: 0, why: 'Syntax of the data — translation, compression, encryption.' },
      { q: 'A /24 IPv4 subnet has how many usable hosts?', options: ['254', '256', '255', '128'], answer: 0, why: '2^8 − 2 = 254 (network and broadcast reserved).' },
    ],
  },

  interview: {
    keywords: ['interview', ' hr', 'resume', 'star', 'behaviour', 'behavior', 'yourself', 'strength', 'weakness', 'salary', 'company', 'recruiter', 'group discussion', 'body language', 'communication', 'elevator'],
    summary:
      'HR and behavioural rounds are scored on structure, self-awareness and fit — not on what you say but on how clearly it is organised. Every answer should be a short story with a result attached, never a rambling autobiography.',
    keyPoints: [
      'STAR for behavioural: Situation → Task → Action → Result, in that order, under 90 seconds',
      'Know your own resume line by line — anything on it is fair game',
      '"Strength" answers need evidence; "weakness" answers need a fix you are actually using',
      'Why this company? needs a specific reason — product, team, or problem you admire',
      'Quantify results: "reduced load time 40%" beats "made it faster"',
      'Close with a question of your own — curiosity is scored',
    ],
    formulas: [
      { formula: 'STAR = Situation · Task · Action · Result', meaning: 'The behavioural answer skeleton' },
      { formula: 'Answer length ≈ 60–90 seconds', meaning: 'Long enough to prove structure, short enough to keep attention' },
      { formula: 'Result = number or observable change', meaning: 'A story without an outcome is incomplete' },
      { formula: '70% role-specific · 30% generic', meaning: 'Prepare company-tailored stories first' },
    ],
    mistakes: [
      'Listing responsibilities instead of results — "responsible for X" proves nothing.',
      'Using "I" for team wins and "we" for failures — interviewers notice.',
      'A generic weakness ("I work too hard") that reads as a rehearsed deflection.',
      'No prep question at the end, which reads as low interest in the role.',
    ],
    example: {
      problem: 'Tell me about a time you failed.',
      solution:
        'S: deadline I misjudged on a group project. T: get the demo back on track. A: split the work, daily check-ins, cut scope to the core feature. R: shipped on time, and I now pad estimates by 30% — the lesson, stated out loud, is the actual answer.',
    },
    questions: [
      { q: 'The STAR framework stands for:', options: ['Situation, Task, Action, Result', 'Skill, Talent, Ability, Reward', 'Start, Try, Adjust, Repeat', 'Study, Talk, Apply, Review'], answer: 0, why: 'The standard structure for behavioural answers.' },
      { q: 'How long should a typical interview answer be?', options: ['60–90 seconds', '30 seconds max', '5 minutes', 'As long as needed'], answer: 0, why: 'Short enough to keep the interviewer engaged, long enough to show structure.' },
      { q: 'The best way to describe a weakness is to:', options: ['Name a real one and the concrete steps you are taking', 'Say you have none', 'Pick a strength disguised as a weakness', 'Blame a teammate'], answer: 0, why: 'Self-awareness plus a remediation plan is what is being scored.' },
      { q: 'Your resume matters in an interview because:', options: ['Every line is a question they may ask', 'It proves you can format documents', 'It replaces the technical round', 'It is only read after the offer'], answer: 0, why: 'Unprepared candidates fail on their own listed experience.' },
      { q: 'In "Why this company?", a strong answer mentions:', options: ['Something specific to this company', 'Salary and benefits', 'That you need any job', 'Your previous employer'], answer: 0, why: 'Specificity is the only signal that distinguishes real interest.' },
      { q: 'A quantified achievement sounds like:', options: ['Cut API latency by 40% for 10k users', 'Worked hard on the API', 'Helped with performance', 'Responsible for speed'], answer: 0, why: 'Numbers make a claim verifiable.' },
      { q: 'The best closing question is:', options: ['What does success look like in the first 90 days?', 'How long is lunch?', 'What is the salary?', 'Nothing — end it quickly'], answer: 0, why: 'It signals you are already thinking about performing in the role.' },
      { q: 'In a group discussion you should primarily:', options: ['Listen, then add a structured point', 'Speak the most', 'Interrupt to be noticed', 'Agree with everyone'], answer: 0, why: 'Quality of contribution beats airtime.' },
    ],
  },
}

/* ==================================================================
 * 2. TOPIC SUGGESTIONS
 * ================================================================== */

const SYLLABUS_PRESETS = {
  mathematics: [
    ['Probability', 'hard', 'high', 60],
    ['Matrices & Determinants', 'medium', 'high', 45],
    ['Differential Calculus', 'hard', 'high', 60],
    ['Integral Calculus', 'hard', 'high', 60],
    ['Statistics & Distributions', 'medium', 'high', 45],
    ['Algebra & Quadratic Equations', 'medium', 'medium', 40],
    ['Trigonometry', 'medium', 'medium', 40],
    ['Coordinate Geometry', 'easy', 'medium', 30],
    ['Vectors & 3D Geometry', 'hard', 'medium', 50],
    ['Sets, Relations & Functions', 'easy', 'low', 25],
    ['Permutations & Combinations', 'hard', 'high', 45],
    ['Binomial Theorem', 'medium', 'medium', 35],
  ],
  physics: [
    ['Kinematics & Motion', 'medium', 'high', 45],
    ['Laws of Motion & Friction', 'medium', 'high', 45],
    ['Work, Energy & Power', 'medium', 'high', 40],
    ['Rotational Dynamics', 'hard', 'high', 60],
    ['Electrostatics', 'hard', 'high', 55],
    ['Current Electricity', 'medium', 'high', 45],
    ['Magnetism & EM Induction', 'hard', 'high', 55],
    ['Optics', 'medium', 'medium', 40],
    ['Thermodynamics', 'hard', 'medium', 50],
    ['Modern Physics', 'easy', 'high', 35],
    ['Waves & Sound', 'medium', 'medium', 35],
    ['Semiconductors', 'easy', 'low', 25],
  ],
  chemistry: [
    ['Mole Concept & Stoichiometry', 'medium', 'high', 45],
    ['Chemical Bonding', 'medium', 'high', 45],
    ['Thermodynamics & Equilibrium', 'hard', 'high', 55],
    ['Electrochemistry', 'medium', 'high', 45],
    ['Organic Reaction Mechanisms', 'hard', 'high', 60],
    ['Coordination Compounds', 'hard', 'medium', 50],
    ['Periodic Table & Trends', 'easy', 'medium', 30],
    ['Atomic Structure', 'easy', 'medium', 30],
    ['Solutions & Colligative Properties', 'medium', 'medium', 40],
    ['Biomolecules', 'easy', 'low', 25],
    ['Polymers', 'easy', 'low', 20],
    ['p-Block Elements', 'medium', 'medium', 35],
  ],
  computer: [
    ['Data Structures & Complexity', 'medium', 'high', 45],
    ['Sorting & Searching Algorithms', 'medium', 'high', 40],
    ['Operating Systems — Scheduling', 'medium', 'high', 40],
    ['Computer Networks & OSI Model', 'easy', 'high', 35],
    ['DBMS & SQL Queries', 'medium', 'high', 45],
    ['Theory of Computation', 'hard', 'medium', 50],
    ['Compiler Design', 'hard', 'low', 45],
    ['Memory Management', 'medium', 'medium', 35],
    ['Graph Algorithms', 'hard', 'high', 50],
    ['Object Oriented Programming', 'easy', 'high', 35],
    ['Discrete Mathematics', 'hard', 'medium', 45],
    ['Software Engineering', 'easy', 'low', 25],
  ],
  // ---- placement / internship / interview tracks ------------------
  aptitude: [
    ['Percentages', 'medium', 'high', 40],
    ['Profit, Loss & Discounts', 'medium', 'high', 40],
    ['Time, Speed & Distance', 'hard', 'high', 50],
    ['Ratio & Proportion', 'medium', 'high', 35],
    ['Time & Work', 'medium', 'medium', 35],
    ['Number System', 'medium', 'medium', 40],
    ['Averages & Alligation', 'easy', 'medium', 30],
    ['Data Interpretation — Charts & Tables', 'medium', 'high', 45],
    ['Series & Analogies', 'medium', 'medium', 30],
    ['Blood Relations & Direction Sense', 'easy', 'medium', 25],
    ['Coding–Decoding & Odd One Out', 'medium', 'medium', 30],
    ['Reading Comprehension', 'easy', 'low', 25],
  ],
  dsa: [
    ['Arrays & Strings', 'medium', 'high', 40],
    ['Hashing & Hash Maps', 'medium', 'high', 35],
    ['Two Pointers & Sliding Window', 'hard', 'high', 45],
    ['Recursion & Backtracking', 'hard', 'high', 50],
    ['Stacks & Queues', 'medium', 'medium', 30],
    ['Linked Lists', 'medium', 'medium', 35],
    ['Trees & BST', 'hard', 'high', 50],
    ['Graphs — BFS, DFS & Shortest Path', 'hard', 'high', 55],
    ['Dynamic Programming Basics', 'hard', 'high', 60],
    ['Sorting & Searching', 'medium', 'high', 35],
    ['Greedy Algorithms', 'medium', 'medium', 40],
    ['Time & Space Complexity', 'easy', 'high', 25],
  ],
  interview: [
    ['Tell Me About Yourself', 'easy', 'high', 15],
    ['Strengths & Weaknesses', 'medium', 'high', 20],
    ['STAR Behavioural Stories', 'medium', 'high', 40],
    ['Why This Company?', 'medium', 'high', 20],
    ['Projects & Resume Walkthrough', 'hard', 'high', 45],
    ['Common HR Questions', 'easy', 'medium', 30],
    ['HR Round: Goals, Salary & Joining', 'medium', 'medium', 25],
    ['Group Discussion Round', 'medium', 'medium', 30],
    ['Communication & Body Language', 'easy', 'medium', 20],
    ['Mock Interview Practice', 'hard', 'high', 45],
  ],
}

const GENERIC_TEMPLATES = [
  ['{S} — Core Concepts & Definitions', 'easy', 'medium', 30],
  ['{S} — Fundamental Techniques', 'medium', 'high', 40],
  ['{S} — Important Formulae', 'easy', 'high', 25],
  ['{S} — Advanced Problems', 'hard', 'high', 60],
  ['{S} — Previous Year Questions', 'medium', 'high', 45],
  ['{S} — Common Mistakes & Traps', 'medium', 'medium', 30],
  ['{S} — Applications & Word Problems', 'hard', 'medium', 50],
  ['{S} — Quick Revision Notes', 'easy', 'low', 20],
  ['{S} — Diagrams / Derivations', 'medium', 'medium', 35],
  ['{S} — Mixed Practice Set', 'hard', 'medium', 45],
]

function matchPreset(subjectName) {
  const s = subjectName.toLowerCase()
  for (const [key, list] of Object.entries(SYLLABUS_PRESETS)) {
    if (s.includes(key)) return list
    if (key === 'mathematics' && /(math|calc|algebra)/.test(s)) return list
    if (key === 'computer' && /(computer|\bcs\b|information tech|software|programming)/.test(s)) return list
    if (key === 'aptitude' && /(aptitude|quant|reasoning|verbal|logical|arithmetic|placement)/.test(s)) return list
    if (key === 'dsa' && /(dsa|data structure|problem solv|coding round|competitive prog)/.test(s)) return list
    if (key === 'interview' && /(interview|\bhr\b|communication|soft skill|mock pi)/.test(s)) return list
  }
  return null
}

export function localGenerateTopics({ subjectName, syllabus = '', count = 8 }) {
  const preset = matchPreset(subjectName)
  const out = []

  if (preset) {
    for (const [name, difficulty, importance, mins] of preset.slice(0, count)) {
      out.push({ name, difficulty, importance, estimatedMinutes: mins, confidence: guessConfidence(name, importance, syllabus) })
    }
  }

  // Blend in explicit syllabus keywords so a pasted syllabus is respected.
  if (out.length < count && syllabus.trim()) {
    const words = syllabus
      .split(/[,;\n•\-–—]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 3 && w.length < 60)
    for (const w of words) {
      if (out.length >= count) break
      if (out.some((t) => t.name.toLowerCase() === w.toLowerCase())) continue
      out.push({
        name: w.charAt(0).toUpperCase() + w.slice(1),
        difficulty: 'medium',
        importance: 'high',
        estimatedMinutes: 40,
        confidence: guessConfidence(w, 'high', syllabus),
      })
    }
  }

  // Fill the remainder with adaptable templates.
  let i = 0
  while (out.length < count) {
    const [name, difficulty, importance, mins] = GENERIC_TEMPLATES[i++ % GENERIC_TEMPLATES.length]
    out.push({
      name: name.replace('{S}', subjectName),
      difficulty,
      importance,
      estimatedMinutes: mins,
      confidence: guessConfidence(name, importance, syllabus),
    })
    if (i > 60) break
  }

  return out.slice(0, count)
}

function guessConfidence(name, importance, syllabus) {
  const base = importance === 'high' ? 38 : importance === 'medium' ? 52 : 66
  const skew = (hash(name) % 25) - 12
  const syllabusBoost = syllabus && syllabus.toLowerCase().includes(name.toLowerCase().slice(0, 8)) ? 8 : 0
  return Math.max(5, Math.min(95, base + skew + syllabusBoost))
}

function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

/* ==================================================================
 * 3. REVISION SHEET
 * ================================================================== */

function bankFor(topic) {
  const hay = `${topic.name} ${topic.notes || ''}`.toLowerCase()
  let best = null
  let bestScore = 0
  for (const entry of Object.values(BANK)) {
    const score = entry.keywords.reduce((a, k) => (hay.includes(k) ? a + k.length : a), 0)
    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }
  return bestScore > 0 ? best : null
}

export function localExplain(topic, subjectName) {
  const bank = bankFor(topic)
  const label = subjectName ? `${subjectName} — ${topic.name}` : topic.name

  if (bank) {
    return {
      summary: bank.summary,
      keyPoints: bank.keyPoints,
      formulas: bank.formulas,
      mistakes: bank.mistakes,
      example: bank.example,
      source: 'bank',
    }
  }

  // Generic but genuinely useful structure for any topic name.
  const n = topic.name
  return {
    summary: `${n} is a recurring theme in ${subjectName || 'this subject'} and carries ${topic.importance === 'high' ? 'high' : topic.importance === 'medium' ? 'moderate' : 'limited'} weightage in your exam. The fastest way to revise it is to work in three passes: (1) definitions and notation, (2) the standard method worked slowly once, (3) timed practice on exam-style questions.`,
    keyPoints: [
      `Write down the 3–5 definitions or statements that every ${n} question assumes you know.`,
      `Learn the standard method as a fixed sequence of steps — do not improvise under time pressure.`,
      `Note the notation variants your textbook uses; mixed notation is the most common cause of lost marks.`,
      `List the 2–3 conditions under which the standard result does NOT apply.`,
      `Do at least one fully worked example and one past-paper question before you move on.`,
      `Close the book and explain ${n} out loud in 60 seconds — gaps you find are your real revision list.`,
    ],
    formulas: [
      { formula: 'Given → Find → Method → Check', meaning: 'The four-line skeleton for any structured question' },
      { formula: `Revision cycle: 10 min read → 20 min problems → 5 min recall`, meaning: 'Spaced retrieval beats re-reading' },
    ],
    mistakes: [
      `Applying a result for ${n} without checking its conditions first.`,
      'Copying a method correctly on worked examples but failing when the question is reworded.',
      'Spending too long on this topic because it feels comfortable — check it against the priority score.',
      'Reading passively instead of attempting questions with the book closed.',
    ],
    example: {
      problem: `Quick self-test: state the core idea of ${n} in one sentence, then solve one standard question without looking at your notes.`,
      solution:
        'If you hesitated on either half, that is your gap. Re-read only the section you stumbled on, then immediately attempt a second question.',
    },
  }
}

/* ==================================================================
 * 4. QUESTIONS
 * ================================================================== */

export function localQuestions(topic, subjectName, count = 8) {
  const bank = bankFor(topic)
  if (bank) {
    const pool = [...bank.questions]
    const out = []
    while (out.length < count && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
    // Round out with generic reasoning questions if the bank is short.
    let extra = 1
    while (out.length < count) {
      out.push(genericQuestion(topic, subjectName, extra++))
    }
    return out
  }
  const out = []
  for (let i = 0; i < count; i++) out.push(genericQuestion(topic, subjectName, i))
  return out
}

function genericQuestion(topic, subjectName, i) {
  const n = topic.name
  const shapes = [
    {
      q: `Which is the BEST first step when answering a ${n} question?`,
      options: [
        'Write down what is given and what must be found',
        'Start calculating immediately with every number visible',
        'Skip the question and return at the end',
        'Rewrite the question in full before beginning',
      ],
      answer: 0,
      why: 'Structured setup prevents method errors and earns method marks.',
    },
    {
      q: `In ${subjectName || 'this subject'}, ${n} is most likely to appear as:`,
      options: [
        'A long-answer question carrying high marks',
        'A fill-in-the-blank definition only',
        'Never examined directly',
        'Only as a bonus question',
      ],
      answer: 0,
      why: `Your plan marks this topic with "${topic.importance}" importance — weightage drives question type.`,
    },
    {
      q: `A student scores ${topic.previousScore ?? 'low'}% on ${n}. What is the most effective next action?`,
      options: [
        'Attempt timed questions on this topic, then review every error',
        'Re-read the whole chapter slowly',
        'Skip the topic entirely',
        'Only read the summary box',
      ],
      answer: 0,
      why: 'Active practice with error review produces the largest score gains.',
    },
    {
      q: `Your confidence in ${n} is ${topic.confidence}%. What does the priority engine do with that?`,
      options: [
        'Raises its priority because the confidence gap is large',
        'Ignores it completely',
        'Lowers its priority automatically',
        'Only counts it if the topic is easy',
      ],
      answer: 0,
      why: 'Confidence gap is a weighted input (22%) to the priority score.',
    },
    {
      q: `Which revision method works BEST for ${n}?`,
      options: [
        'Closed-book practice with spaced repetition',
        'Highlighting the textbook in three colours',
        'Reading the same page repeatedly',
        'Copying notes word for word',
      ],
      answer: 0,
      why: 'Retrieval practice is consistently more effective than re-reading.',
    },
    {
      q: `Which is a common mistake in ${n}?`,
      options: [
        'Using a formula without checking its conditions',
        'Writing the formula before substituting',
        'Checking units at the end',
        'Answering the easiest question first',
      ],
      answer: 0,
      why: 'Condition-checking is the single largest source of avoidable lost marks.',
    },
    {
      q: `How long should you spend on ${n} in this plan?`,
      options: [
        `${topic.recommendedMinutes || topic.estimatedMinutes} minutes, as recommended`,
        'The entire study day',
        'Exactly 5 minutes',
        'No time at all',
      ],
      answer: 0,
      why: 'The scheduler fits this topic to your session length and its priority.',
    },
    {
      q: `You have ${topic.estimatedMinutes} minutes for ${n}. What is the right split?`,
      options: [
        '70% solving questions, 30% reviewing notes',
        '100% reading notes',
        '100% re-writing the chapter',
        'Equal time on unrelated topics',
      ],
      answer: 0,
      why: 'Time-boxed practice is how the plan is designed to be used.',
    },
  ]
  const s = shapes[i % shapes.length]
  return { ...s }
}

/* ==================================================================
 * 5. COPILOT
 * ================================================================== */

export function localAnswer(message, ctx) {
  const m = (message || '').toLowerCase()
  const { topics = [], plan = null, readiness = null, hoursLeft = 0, quizzes = [] } = ctx

  const pending = topics.filter((t) => t.status !== 'done')
  const ranked = [...pending].sort((a, b) => b.priorityScore - a.priorityScore)
  const critical = ranked.filter((t) => t.priorityLevel === 'critical')
  const low = ranked.filter((t) => t.priorityLevel === 'low')
  const fmtH = `${Math.floor(hoursLeft)}h ${Math.round((hoursLeft % 1) * 60)}m`

  const topLine = (t) =>
    t ? `**${t.name}** — ${t.priorityLevel.toUpperCase()} · ${t.recommendedMinutes} min · ${t.priorityReason}` : null

  // ---- what to study next --------------------------------------------
  if (/(what|which).*(study|revise|next|do first)|priority|first/.test(m)) {
    const t = ranked[0]
    if (!t) return '🎉 Every topic is revised. Spend your remaining time on a mock test and a final formula-sheet pass.'
    return [
      `Study **${t.name}** next — **${t.recommendedMinutes} minutes**.`,
      ``,
      `**Why:** ${t.priorityReason}`,
      ``,
      `**Priority:** ${t.priorityLabel} (${t.priorityScore}/100)`,
      ``,
      critical.length > 1
        ? `After that, ${critical[1] ? `**${critical[1].name}**` : ''} is queued as your second critical topic.`
        : `Your remaining critical work: ${critical.length} topic(s).`,
      ``,
      `_Time left before the exam: ${fmtH}._`,
    ].join('\n')
  }

  // ---- limited time ---------------------------------------------------
  if (/(\d+|two|three|one|few|only)\s*(hour|hr|h)\b|limited time|no time|quick|panic|hurry/.test(m)) {
    const hrs = Number(m.match(/(\d+)\s*(hour|hr|h)/)?.[1]) || hoursLeft || 2
    const budget = Math.round(hrs * 60)
    let used = 0
    const picks = []
    for (const t of ranked) {
      if (used + Math.min(t.recommendedMinutes, 25) > budget) continue
      const slot = Math.min(t.recommendedMinutes, 25)
      used += slot
      picks.push(`- **${t.name}** — ${slot} min (${t.priorityLabel})`)
      if (picks.length >= 5) break
    }
    const remaining = budget - used
    return [
      `⏱ With **${hrs} hour(s)** (${budget} min), cut everything except high-impact topics.`,
      ``,
      `**Do this, in order:**`,
      ...picks,
      ...(remaining >= 10 ? [`- **Formula sheet + key concepts** — ${remaining} min`] : []),
      ``,
      `**Skip:** ${low.length ? low.map((t) => t.name).join(', ') : 'nothing — you are already on the important stuff'}.`,
      ``,
      `_Emergency Mode is ${ctx.emergency ? 'ACTIVE' : 'recommended'} — it strips low-value topics automatically._`,
    ].join('\n')
  }

  // ---- what can I skip ------------------------------------------------
  if (/skip|ignore|drop|leave out|not study/.test(m)) {
    if (!low.length) return 'Nothing is safe to skip right now — every remaining topic is medium priority or above.'
    return [
      `You can safely skip or skim:`,
      ...low.map((t) => `- **${t.name}** — ${t.importance} importance, ${t.confidence}% confidence, ${t.priorityScore}/100`),
      ``,
      `Only skip these *after* every CRITICAL and HIGH topic is done.`,
    ].join('\n')
  }

  // ---- placement / interview specific ------------------------------
  if (
    ctx.goalType === 'placement' &&
    /(interview|hr round|placement|campus|recruiter|hiring|aptitude round|resume|behavioural|behavioral|group discussion|offer)/.test(m)
  ) {
    const focus = ranked.filter((t) => t.status !== 'done').slice(0, 4)
    const hrTopics = ranked.filter((t) => /interview|hr|star|resume|strength|weakness|communication|yourself|company/i.test(t.name))
    return [
      `🎯 **Placement sprint — ${fmtH} until your interview/test.**`,
      ``,
      `**Round-by-round focus:**`,
      `- **Aptitude / online test** → speed drills: percentages, TSD, DI. Do them timed, never casually.`,
      `- **Coding round** → patterns over puzzles: two pointers, hashing, BFS/DFS, one easy DP.`,
      `- **Technical + HR** → your resume stories, one STAR example per project, and the "explain X" answers.`,
      ``,
      `**Your plan, in order:**`,
      ...(focus.length
        ? focus.map((t) => `- **${t.name}** — ${t.recommendedMinutes} min (${t.priorityLabel}: ${t.priorityReason})`)
        : [`- Everything is revised — spend the time on a full mock round.`]),
      ``,
      hrTopics.length
        ? `**HR round checklist:** ${hrTopics.map((t) => t.name).join(' · ')} — prepare these as 60-second STAR answers.`
        : `Add an "Interview & HR" subject if you want me to schedule story prep as well.`,
      ``,
      `_Readiness is at ${readiness ? `${readiness.score}%` : 'n/a'}${readiness ? ` (${readiness.grade})` : ''}._`,
    ].join('\n')
  }

  // ---- explain simply -------------------------------------------------
  if (/explain|simplif|what is|understand|teach|eli5/.test(m)) {
    const target = ranked.find((t) => m.includes(t.name.toLowerCase().split(' ')[0])) || ranked[0]
    if (!target) return 'Add some topics first and I will explain them for you.'
    return [
      `**${target.name} — explained simply**`,
      ``,
      `Think of it as: the examiners want to see whether you can ${target.name.toLowerCase()} under time pressure, not whether you can recite a definition.`,
      ``,
      `**The 80/20 of this topic:**`,
      `- Focus on the 2–3 standard methods; most marks come from applying them correctly.`,
      `- Learn the conditions under which each result holds — that is where marks are lost.`,
      `- Do one worked example, then two timed questions with your notes closed.`,
      ``,
      `**Your status:** ${target.confidence}% confidence, previous score ${target.previousScore ?? 'n/a'}%, estimated ${target.estimatedMinutes} min.`,
      ``,
      `Say "test me on ${target.name}" when you are ready.`,
    ].join('\n')
  }

  // ---- test me --------------------------------------------------------
  if (/test me|quiz|mcq|question|practice/.test(m)) {
    const t = ranked[0]
    if (!t) return 'All topics are complete — try a full mock test from your plan instead.'
    return [
      `Ready to be tested on **${t.name}**.`,
      ``,
      `Open the topic and hit **Start Revision** — I will generate 8 exam-style MCQs with instant feedback.`,
      ``,
      `Your last performance there: ${t.previousScore ? `${t.previousScore}%` : 'no attempt yet'} · confidence ${t.confidence}%.`,
      ``,
      `Expected difficulty: **${t.difficulty}**. Score above 70% and I will drop its priority automatically.`,
    ].join('\n')
  }

  // ---- readiness ------------------------------------------------------
  if (/ready|readiness|score|chance|pass|fail/.test(m) && readiness) {
    const weak = readiness.attention.map((t) => t.name)
    return [
      `📊 **Exam Readiness: ${readiness.score}%** — ${readiness.grade}`,
      ``,
      `**How it was calculated:** ${readiness.explanation}`,
      ``,
      weak.length
        ? `**Needs attention:** ${weak.join(', ')}`
        : `No weak areas detected — keep your accuracy up with one more quiz.`,
      ``,
      readiness.score >= 70
        ? `You are in a good position. Protect it by finishing every CRITICAL topic.`
        : `Focus on high-weightage gaps first — that is the fastest route to +10 points.`,
    ].join('\n')
  }

  // ---- schedule / plan ------------------------------------------------
  if (/plan|schedule|today|timetable|when|hour/.test(m) && plan) {
    const today = plan.days?.[0]
    if (!today) return 'Your plan has not been generated yet — open the **Plan** tab and hit Generate.'
    const next = today.sessions.filter((s) => s.kind !== 'break').slice(0, 5)
    return [
      `📅 **${today.label} — ${Math.round(today.studyMinutes / 60 * 10) / 10}h of study**`,
      ``,
      ...next.map((s) => `- \`${s.startTime}–${s.endTime}\` ${s.title}${s.reason ? ` — ${s.reason}` : ''}`),
      ``,
      `Your plan has ${plan.stats.totalSessions} sessions totalling ${plan.stats.totalHours}h across ${plan.days.length} day(s).`,
    ].join('\n')
  }

  // ---- performance ----------------------------------------------------
  if (/score|quiz result|accuracy|how did i do|progress/.test(m) && quizzes.length) {
    const avg = Math.round(quizzes.reduce((a, q) => a + q.accuracy, 0) / quizzes.length)
    return [
      `📈 Across **${quizzes.length} quiz attempt(s)** your average accuracy is **${avg}%**.`,
      ``,
      avg >= 75
        ? `That is strong. Priorities are already shifting away from these topics.`
        : `Every topic you score below 60% on gets an automatic priority boost.`,
      ``,
      `Keep going — each attempt updates your Exam Readiness Score.`,
    ].join('\n')
  }

  // ---- fallback -------------------------------------------------------
  return [
    `Here is what I can do with **your actual revision data**:`,
    ``,
    `- *“What should I study next?”*`,
    `- *“I have only 2 hours left — what do I revise?”*`,
    `- *“Which topics can I skip?”*`,
    `- *“Explain ${ranked[0]?.name ?? 'a topic'} simply”*`,
    `- *“Test me on this topic”*`,
    ctx.goalType === 'placement'
      ? `- *“How should I prepare for my interview rounds?”*`
      : `- *“How ready am I for the exam?”*`,
    ``,
    `**Right now:** ${ranked[0] ? topLine(ranked[0]) : 'all topics complete 🎉'} · ${fmtH} until ${
      ctx.goalType === 'placement' ? 'the interview/test' : 'the exam'
    }.`,
  ].join('\n')
}

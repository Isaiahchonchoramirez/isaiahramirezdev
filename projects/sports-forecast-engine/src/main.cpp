#include <algorithm>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <map>
#include <numeric>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

struct Match { std::string date, home, away; int homeGoals{}, awayGoals{}; };
struct Record { double scored{}, conceded{}; int games{}; };
struct Forecast { double homeWin{}, draw{}, awayWin{}, homeGoals{}, awayGoals{}; int likelyHome{}, likelyAway{}; };

static std::vector<std::string> csvRow(const std::string& line) {
    std::vector<std::string> fields;
    std::string field;
    bool quoted = false;
    for (std::size_t i = 0; i < line.size(); ++i) {
        const char c = line[i];
        if (c == '"' && quoted && i + 1 < line.size() && line[i + 1] == '"') { field += '"'; ++i; }
        else if (c == '"') quoted = !quoted;
        else if (c == ',' && !quoted) { fields.push_back(field); field.clear(); }
        else field += c;
    }
    fields.push_back(field);
    return fields;
}

static std::vector<Match> loadMatches(const std::string& path) {
    std::ifstream input(path);
    if (!input) throw std::runtime_error("Could not open " + path);
    std::vector<Match> matches;
    std::string line;
    std::getline(input, line);
    while (std::getline(input, line)) {
        const auto f = csvRow(line);
        if (f.size() != 5) throw std::runtime_error("Malformed CSV row");
        matches.push_back({f[0], f[1], f[2], std::stoi(f[3]), std::stoi(f[4])});
    }
    return matches;
}

class Model {
    std::map<std::string, Record> teams_;
    double leagueHome_ = 1.4, leagueAway_ = 1.1;

public:
    void fit(const std::vector<Match>& matches, std::size_t count) {
        teams_.clear();
        double hg = 0, ag = 0;
        for (std::size_t i = 0; i < count; ++i) {
            const auto& m = matches[i];
            hg += m.homeGoals; ag += m.awayGoals;
            auto& h = teams_[m.home]; auto& a = teams_[m.away];
            h.scored += m.homeGoals; h.conceded += m.awayGoals; ++h.games;
            a.scored += m.awayGoals; a.conceded += m.homeGoals; ++a.games;
        }
        leagueHome_ = hg / static_cast<double>(count);
        leagueAway_ = ag / static_cast<double>(count);
    }

    Forecast predict(const std::string& home, const std::string& away) const {
        const auto estimate = [&](const std::string& name) {
            const auto it = teams_.find(name);
            return it == teams_.end() ? Record{} : it->second;
        };
        const auto h = estimate(home), a = estimate(away);
        const double priorGames = 5.0;
        const double avg = (leagueHome_ + leagueAway_) / 2.0;
        const double hAttack = (h.scored + priorGames * avg) / (h.games + priorGames) / avg;
        const double hDefense = (h.conceded + priorGames * avg) / (h.games + priorGames) / avg;
        const double aAttack = (a.scored + priorGames * avg) / (a.games + priorGames) / avg;
        const double aDefense = (a.conceded + priorGames * avg) / (a.games + priorGames) / avg;
        const double lambdaH = std::clamp(leagueHome_ * hAttack * aDefense, 0.15, 4.5);
        const double lambdaA = std::clamp(leagueAway_ * aAttack * hDefense, 0.15, 4.5);
        const auto poisson = [](int k, double lambda) {
            return std::exp(-lambda) * std::pow(lambda, k) / std::tgamma(k + 1.0);
        };
        Forecast f; f.homeGoals = lambdaH; f.awayGoals = lambdaA;
        double best = -1;
        for (int x = 0; x <= 8; ++x) for (int y = 0; y <= 8; ++y) {
            const double p = poisson(x, lambdaH) * poisson(y, lambdaA);
            if (x > y) f.homeWin += p; else if (x == y) f.draw += p; else f.awayWin += p;
            if (p > best) { best = p; f.likelyHome = x; f.likelyAway = y; }
        }
        const double total = f.homeWin + f.draw + f.awayWin;
        f.homeWin /= total; f.draw /= total; f.awayWin /= total;
        return f;
    }
};

static int outcome(int h, int a) { return h > a ? 0 : (h == a ? 1 : 2); }

int main(int argc, char** argv) {
    try {
        const std::string input = argc > 1 ? argv[1] : "data/premier-league-2015-16.csv";
        const auto matches = loadMatches(input);
        if (matches.size() < 20) throw std::runtime_error("Need at least 20 matches");
        const std::size_t split = matches.size() * 4 / 5;
        double logLoss = 0, brier = 0, goalMae = 0, predictedGoals = 0, actualGoals = 0;
        int correct = 0, homeActual = 0, drawActual = 0, awayActual = 0;
        int homeCorrect = 0, drawCorrect = 0, awayCorrect = 0;
        Model model;
        for (std::size_t i = split; i < matches.size(); ++i) {
            model.fit(matches, i); // expanding window: only games known at prediction time
            const auto f = model.predict(matches[i].home, matches[i].away);
            const std::vector<double> p{f.homeWin, f.draw, f.awayWin};
            const int actual = outcome(matches[i].homeGoals, matches[i].awayGoals);
            const int predicted = static_cast<int>(std::max_element(p.begin(), p.end()) - p.begin());
            correct += predicted == actual;
            homeActual += actual == 0; drawActual += actual == 1; awayActual += actual == 2;
            homeCorrect += predicted == 0 && actual == 0;
            drawCorrect += predicted == 1 && actual == 1;
            awayCorrect += predicted == 2 && actual == 2;
            logLoss -= std::log(std::max(p[actual], 1e-12));
            for (int k = 0; k < 3; ++k) brier += std::pow(p[k] - (actual == k ? 1.0 : 0.0), 2);
            goalMae += (std::abs(f.homeGoals - matches[i].homeGoals) + std::abs(f.awayGoals - matches[i].awayGoals)) / 2.0;
            predictedGoals += f.homeGoals + f.awayGoals;
            actualGoals += matches[i].homeGoals + matches[i].awayGoals;
        }
        const double n = static_cast<double>(matches.size() - split);
        model.fit(matches, matches.size());
        const auto example = model.predict("Leicester City", "Arsenal");
        std::cout << std::fixed << std::setprecision(3)
          << "{\n  \"source\": \"StatsBomb Open Data · Premier League 2015/16 · chronological 80/20 holdout\",\n"
          << "  \"sourceUrl\": \"https://github.com/statsbomb/open-data\",\n"
          << "  \"sample\": \"" << matches.size() << " matches · " << static_cast<int>(n) << " held out\",\n"
          << "  \"metrics\": [\n"
          << "    {\"label\": \"Outcome accuracy\", \"value\": \"" << 100.0 * correct / n << "%\"},\n"
          << "    {\"label\": \"Multiclass log loss\", \"value\": \"" << logLoss / n << "\"},\n"
          << "    {\"label\": \"Goal MAE\", \"value\": \"" << goalMae / n << "\"},\n"
          << "    {\"label\": \"Held-out matches\", \"value\": \"" << static_cast<int>(n) << "\"}\n  ],\n"
          << "  \"charts\": [\n"
          << "    {\"title\": \"Correct outcomes by result\", \"subtitle\": \"Accuracy within each actual result class; draws are the hardest outcome.\", \"xLabel\": \"Percent correctly classified\", \"yLabel\": \"Actual match result\", \"series\": [{\"name\": \"Accuracy\", \"values\": ["
          << "{\"label\": \"Home win\", \"value\": " << (homeActual ? 100.0 * homeCorrect / homeActual : 0) << "},"
          << "{\"label\": \"Draw\", \"value\": " << (drawActual ? 100.0 * drawCorrect / drawActual : 0) << "},"
          << "{\"label\": \"Away win\", \"value\": " << (awayActual ? 100.0 * awayCorrect / awayActual : 0) << "}]}]},\n"
          << "    {\"title\": \"Goals per held-out match\", \"subtitle\": \"Aggregate scoring level predicted before each game compared with the result.\", \"xLabel\": \"Average total goals\", \"yLabel\": \"Model versus observed\", \"series\": [{\"name\": \"Goals\", \"values\": ["
          << "{\"label\": \"Predicted\", \"value\": " << predictedGoals / n << "},{\"label\": \"Actual\", \"value\": " << actualGoals / n << "}]}]}\n  ],\n"
          << "  \"findings\": [\n"
          << "    \"Every held-out forecast was generated before that match and the model was then updated, preventing future results from leaking backward.\",\n"
          << "    \"The model estimates team attack, defense, and home advantage, then converts expected goals into score and win/draw/loss probabilities with a Poisson distribution.\",\n"
          << "    \"A full-season Leicester City vs Arsenal example produces " << 100 * example.homeWin << "% home, " << 100 * example.draw << "% draw, and " << 100 * example.awayWin << "% away, with " << example.likelyHome << "–" << example.likelyAway << " the most likely score.\",\n"
          << "    \"This is an educational baseline, not betting advice: injuries, lineups, odds, and uncertainty beyond historical scores are not modeled.\"\n  ],\n"
          << "  \"updated\": \"Rebuilt by the C++20 engine from the committed match CSV\"\n}\n";
        std::cerr << "Brier: " << brier / n << "\n";
    } catch (const std::exception& error) {
        std::cerr << "sports-forecast: " << error.what() << '\n';
        return 1;
    }
}

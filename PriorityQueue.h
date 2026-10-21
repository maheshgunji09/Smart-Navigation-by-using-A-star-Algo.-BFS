#ifndef SNS_PRIORITY_QUEUE_H
#define SNS_PRIORITY_QUEUE_H

#include <vector>
#include <utility>
#include <algorithm>

namespace sns {

// Binary min-heap over pair<double, int>.
// Provided as an educational stand-in for std::priority_queue.
template <typename K = double, typename V = int>
class MinHeap {
public:
    using Item = std::pair<K, V>;
    bool empty() const { return h_.empty(); }
    std::size_t size() const { return h_.size(); }
    void push(const Item& x) {
        h_.push_back(x);
        siftUp(h_.size() - 1);
    }
    Item pop() {
        Item top = h_.front();
        h_.front() = h_.back();
        h_.pop_back();
        if (!h_.empty()) siftDown(0);
        return top;
    }
private:
    std::vector<Item> h_;
    void siftUp(std::size_t i) {
        while (i > 0) {
            std::size_t p = (i - 1) / 2;
            if (h_[p].first <= h_[i].first) break;
            std::swap(h_[p], h_[i]);
            i = p;
        }
    }
    void siftDown(std::size_t i) {
        std::size_t n = h_.size();
        while (true) {
            std::size_t l = 2 * i + 1, r = 2 * i + 2, s = i;
            if (l < n && h_[l].first < h_[s].first) s = l;
            if (r < n && h_[r].first < h_[s].first) s = r;
            if (s == i) break;
            std::swap(h_[s], h_[i]);
            i = s;
        }
    }
};

} // namespace sns

#endif

def max_subarray_sum(arr):
    """
    Kadane's Algorithm.
    
    time  : O(n)
    space : O(1)
    """
    max_ending_here = 0
    max_so_far      = 0
    for x in arr:
        max_ending_here = max(x, max_ending_here + x)       
        max_so_far      = max(max_so_far, max_ending_here)  
        print(f'x = {x:<3} max_ending_here = {max_ending_here:<3} max_so_far = {max_so_far}')
    return max_so_far


if __name__ == "__main__":
    arr1 = [1,2,5]                 # = 8
    arr2 = [3,4,-5,6,7]            # = [3,4,-5,6,7] = 13
    arr3 = [-3,-1,-1,-5,1,2,3,4,5] # = [1,2,3,4,5] = 15
    arr4 = [34, -50, 42, 14, -5, 86]


    for arr in [arr1,arr2,arr3,arr4]:
        print(max_subarray_sum(arr))

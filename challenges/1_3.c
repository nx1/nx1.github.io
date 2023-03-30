#include <stdio.h>
#include <stdlib.h>


int *subarray(int *arr, int lo, int hi){
    int size = hi - lo;
    int *sub = malloc(size * sizeof(int));

    for(int i=0;i<size;i++){
        sub[i] = arr[lo+i];
    } 
    return sub;
}

int sum(int *arr, int n){
    int sum = 0;
    for(int i=0;i<n;i++){
        sum = sum + arr[i];
    }
    return sum;

}

void print_arr(int *arr, int n){
    printf("Array: [");
    for(int i=0;i<n;i++){
        printf("%d, ", arr[i]);
    }
    printf("]\n");
}

int calc_max_subarray_sum(int arr[], int n){
    int max_arr_sum = 0;
    for(int i=0;i<n;i++){
        int *sub1 = subarray(arr,0,i);
        int *sub2 = subarray(arr,i,n);

        int n2 = n - i;

        int sum1 = sum(sub1, i);
        int sum2 = sum(sub2, n2);

        print_arr(sub1, i);
        print_arr(sub2, n2);
        if (sum1>max_arr_sum){
            max_arr_sum = sum1;
        }
        if (sum2>max_arr_sum){
            max_arr_sum = sum2;
        }
    }
    return max_arr_sum;
}

int main(){
    int n = 6;
    int arr1[6] = {34,-50,42,14,-5,86};
    
    printf("Input array:\n");
    print_arr(arr1,6);
    printf("Output:\n");
    printf("%d\n", calc_max_subarray_sum(arr1, n));
}

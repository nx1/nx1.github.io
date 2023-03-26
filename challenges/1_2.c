#include <stdio.h>


void print_arr(int *arr, int n){
        for (int i=0;i<n;i++){
            printf("%d \n",arr[i]);
        }
}

void insertion_sort(int arr[], int n){
        int lowest_idx = 0;
        for (int i=0;i<n;i++){
            int lowest = 99999999;
            for (int j=i;j<n;j++){
                int val = arr[j];
                printf("i=%d j=%d, val=%d\n",i,j,val);
                if (val < lowest){
                    printf("%d<%d \n", val, lowest);
                    lowest = val;
                    lowest_idx = j;
                }
            int prev = arr[i];
            arr[i] = lowest;
            arr[lowest_idx] = prev;
            }

        }
        print_arr(arr, n);

}


int main(){
    int arr1[5] = {3,7,5,6,9};
    print_arr(arr1, 5);
    printf("---------- \n");
    insertion_sort(arr1, 5);

    return 0;
}
